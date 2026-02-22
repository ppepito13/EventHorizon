
'use server';

import { z } from 'zod';
import { getEventById } from '@/lib/data';
import type { Registration } from '@/lib/types';
import { initializeFirebase } from '@/firebase/init';
import { collection, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { randomUUID } from 'crypto';

export async function registerForEvent(
  eventId: string,
  data: { [key: string]: unknown }
): Promise<{
  success: boolean;
  registration?: Registration;
  errors?: { [key:string]: string[] } | { _form: string[] };
}> {
  const { firestore } = initializeFirebase();
  try {
    // Get event data from JSON for form validation and basic info
    const jsonEvent = await getEventById(eventId);
    if (!jsonEvent) {
      throw new Error('Event configuration not found.');
    }

    // Get event data from Firestore to retrieve ownership for security rules
    const eventDocRef = doc(firestore, 'events', eventId);
    const eventDoc = await getDoc(eventDocRef);
    if (!eventDoc.exists()) {
        throw new Error('Event not found in database.');
    }
    const firestoreEvent = eventDoc.data();

    // Dynamically build Zod schema from event configuration on the server
    const schemaFields = jsonEvent.formFields.reduce(
      (acc, field) => {
        let zodType: z.ZodTypeAny;

        switch (field.type) {
          case 'email':
            zodType = z.string().email({ message: 'Invalid email address.' });
            break;
          case 'tel':
            zodType = z.string().min(7, "Phone number is too short.").regex(/^[\d\s+()-]+$/, {
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

    // 1. Create QR code document
    const qrCodeData = {
        eventId: jsonEvent.id,
        eventName: jsonEvent.name,
        formData: validated.data,
        registrationDate: registrationTime.toISOString(),
    };
    const qrDocRef = await addDoc(collection(firestore, "qrcodes"), qrCodeData);

    // 2. Create the main registration document, now with denormalized owner fields
    const registrationId = `reg_${randomUUID()}`;
    const newRegistrationData = {
        eventId: jsonEvent.id,
        eventName: jsonEvent.name,
        formData: validated.data,
        qrId: qrDocRef.id,
        registrationDate: registrationTime.toISOString(),
        // Add denormalized fields for security rules
        eventOwnerId: firestoreEvent.ownerId,
        eventMembers: firestoreEvent.members,
    };
    
    const registrationDocRef = doc(firestore, 'events', jsonEvent.id, 'registrations', registrationId);
    await setDoc(registrationDocRef, newRegistrationData);

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
