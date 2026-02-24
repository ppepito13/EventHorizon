
'use server';

import { z } from 'zod';
import { getEventById } from '@/lib/data';
import type { Registration } from '@/lib/types';
import { adminDb } from '@/lib/firebase-admin';
import { randomUUID } from 'crypto';
import { sendConfirmationEmail } from '@/lib/email';
import QRCode from 'qrcode';

export async function registerForEvent(
  eventId: string,
  data: { [key: string]: unknown }
): Promise<{
  success: boolean;
  registration?: Registration;
  errors?: { [key:string]: string[] } | { _form: string[] };
}> {
  try {
    // Get event data from JSON for form validation and basic info
    const jsonEvent = await getEventById(eventId);
    if (!jsonEvent) {
      throw new Error('Event configuration not found.');
    }

    // Get event data from Firestore to retrieve ownership for security rules
    const eventDocRef = adminDb.doc(`events/${eventId}`);
    const eventDoc = await eventDocRef.get();
    if (!eventDoc.exists) {
        throw new Error('Event not found in database.');
    }
    const firestoreEvent = eventDoc.data()!;

    // Dynamically build Zod schema from event configuration on the server
    const schemaFields = jsonEvent.formFields.reduce(
      (acc, field) => {
        let zodType: z.ZodTypeAny;

        switch (field.type) {
          case 'email':
            zodType = z.string().email({ message: 'Invalid email address.' });
            break;
          case 'tel':
            zodType = z.string()
              .refine(val => val.length === 0 || val.length >= 7, {
                  message: "Phone number is too short.",
              })
              .refine(val => val.length === 0 || /^[\d\s+()-]+$/.test(val), {
                  message: "Phone number can only contain digits, spaces, and characters like + ( ) -",
              });
            break;
          case 'checkbox':
            zodType = z.boolean();
            break;
          case 'radio':
            zodType = z.string();
            break;
          case 'multiple-choice':
            zodType = z.array(z.string());
            break;
          case 'textarea':
          default:
            zodType = z.string();
            break;
        }

        if (field.required) {
          if (zodType instanceof z.ZodString) {
              zodType = zodType.min(1, { message: `${field.label} is required.` });
          } else if (zodType instanceof z.ZodArray) {
              zodType = zodType.min(1, { message: `Please select at least one option for ${field.label}.` });
          } else if (zodType instanceof z.ZodBoolean && field.type === 'checkbox') {
               zodType = zodType.refine((val) => val === true, { message: `You must check this box.` });
          }
        } else {
          zodType = zodType.optional();
        }

        acc[field.name] = zodType;
        return acc;
      },
      {} as { [key: string]: z.ZodTypeAny }
    );
    
    schemaFields['rodo'] = z.boolean().refine(val => val === true, {
        message: 'You must agree to the terms and conditions.',
    });

    const schema = z.object(schemaFields);
    
    const validated = schema.safeParse(data);

    if (!validated.success) {
      return {
        success: false,
        errors: validated.error.flatten().fieldErrors,
      };
    }
    
    const registrationTime = new Date();
    const qrId = `qr_${randomUUID()}`;

    // 1. Create QR code document
    const qrCodeData = {
        eventId: jsonEvent.id,
        eventName: jsonEvent.name,
        formData: validated.data,
        registrationDate: registrationTime.toISOString(),
    };
    const qrDocRef = adminDb.collection("qrcodes").doc(qrId);
    await qrDocRef.set(qrCodeData);


    // 2. Create the main registration document, now with denormalized owner fields
    const registrationId = `reg_${randomUUID()}`;
    const newRegistrationData = {
        eventId: jsonEvent.id,
        eventName: jsonEvent.name,
        formData: validated.data,
        qrId: qrId,
        registrationDate: registrationTime.toISOString(),
        // Add denormalized fields for security rules
        eventOwnerId: firestoreEvent.ownerId,
        eventMembers: firestoreEvent.members,
        // Add check-in status
        checkedIn: false,
        checkInTime: null,
    };
    
    const registrationDocRef = adminDb.doc(`events/${jsonEvent.id}/registrations/${registrationId}`);
    await registrationDocRef.set(newRegistrationData);
    
    // 3. Send confirmation email
    try {
        const qrCodeDataUrl = await QRCode.toDataURL(qrId, { errorCorrectionLevel: 'H', width: 256 });
        
        // Extract recipient name and email safely
        const recipientName = (validated.data as any).full_name || 'Uczestniku';
        const recipientEmail = (validated.data as any).email;
        
        if (recipientEmail) {
            await sendConfirmationEmail({
                to: recipientEmail,
                name: recipientName,
                eventName: jsonEvent.name,
                eventDate: jsonEvent.date,
                qrCodeDataUrl: qrCodeDataUrl,
            });
        } else {
             console.warn("No email address found in registration data, skipping email confirmation.");
        }

    } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // We don't fail the whole registration if the email fails,
        // but we should log it for monitoring.
    }


    // Reconstruct the final object without the security fields for the client response
    const { eventOwnerId, eventMembers, ...clientSafeRegistration } = newRegistrationData;
    const finalRegistration: Registration = {
      ...clientSafeRegistration,
      id: registrationId,
    };

    return { success: true, registration: finalRegistration };

  } catch (error) {
    console.error('Registration failed:', error);
    return {
      success: false,
      errors: { _form: ['An unexpected error occurred. Please try again.'] },
    };
  }
}
