
'use server';

import { z } from 'zod';
import { getEventById, getUsers } from '@/lib/data';
import type { Registration } from '@/lib/types';
import { randomUUID } from 'crypto';
import { sendConfirmationEmail } from '@/lib/email';
import QRCode from 'qrcode';

import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, writeBatch } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

export async function registerForEvent(
  eventId: string,
  data: { [key: string]: unknown }
): Promise<{
  success: boolean;
  registration?: Registration;
  errors?: { [key:string]: string[] } | { _form: string[] };
  emailStatus?: 'sent' | 'failed' | 'skipped';
  emailError?: string;
}> {
  const tempAppName = `temp-register-app-${randomUUID()}`;
  let tempApp: FirebaseApp | null = null;
  
  try {
    tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);
    const tempDb = getFirestore(tempApp);

    const users = await getUsers();
    const adminUser = users.find(u => u.role === 'Administrator');
    if (!adminUser || !adminUser.password) {
        throw new Error('Critical: Could not find admin user credentials to perform this action.');
    }
    await signInWithEmailAndPassword(tempAuth, adminUser.email, adminUser.password);
    
    const jsonEvent = await getEventById(eventId);
    if (!jsonEvent) {
      throw new Error('Event configuration not found.');
    }

    const eventDocRef = doc(tempDb, `events/${eventId}`);
    const eventDoc = await getDoc(eventDocRef);
    if (!eventDoc.exists()) {
        throw new Error('Event not found in database.');
    }
    const firestoreEvent = eventDoc.data()!;

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
    const registrationId = `reg_${randomUUID()}`;
    
    const batch = writeBatch(tempDb);

    const qrCodeData = {
        eventId: jsonEvent.id,
        eventName: jsonEvent.name,
        formData: validated.data,
        registrationDate: registrationTime.toISOString(),
    };
    const qrDocRef = doc(tempDb, "qrcodes", qrId);
    batch.set(qrDocRef, qrCodeData);

    const newRegistrationData = {
        eventId: jsonEvent.id,
        eventName: jsonEvent.name,
        formData: validated.data,
        qrId: qrId,
        registrationDate: registrationTime.toISOString(),
        eventOwnerId: firestoreEvent.ownerId,
        eventMembers: firestoreEvent.members,
        checkedIn: false,
        checkInTime: null,
    };
    
    const registrationDocRef = doc(tempDb, `events/${jsonEvent.id}/registrations/${registrationId}`);
    batch.set(registrationDocRef, newRegistrationData);

    await batch.commit();
    
    // Send confirmation email and capture status
    const qrCodeDataUrl = await QRCode.toDataURL(qrId, { errorCorrectionLevel: 'H', width: 256 });
    const recipientName = (validated.data as any).full_name || 'Uczestniku';
    const recipientEmail = (validated.data as any).email;
    
    let emailStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
    let emailError: string | undefined = undefined;

    if (recipientEmail) {
        const emailResult = await sendConfirmationEmail({
            to: recipientEmail,
            name: recipientName,
            eventName: jsonEvent.name,
            eventDate: jsonEvent.date,
            qrCodeDataUrl: qrCodeDataUrl,
        });
        if (emailResult.success) {
            emailStatus = 'sent';
        } else {
            emailStatus = 'failed';
            emailError = emailResult.error;
        }
    } else {
         console.warn("No email address found in registration data, skipping email confirmation.");
         emailStatus = 'skipped';
    }

    const { eventOwnerId, eventMembers, ...clientSafeRegistration } = newRegistrationData;
    const finalRegistration: Registration = {
      ...clientSafeRegistration,
      id: registrationId,
    };

    return { success: true, registration: finalRegistration, emailStatus, emailError };

  } catch (error) {
    console.error('Registration failed:', error);
    const message = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return {
      success: false,
      errors: { _form: [message] },
    };
  } finally {
      if (tempApp) {
          await deleteApp(tempApp);
      }
  }
}
