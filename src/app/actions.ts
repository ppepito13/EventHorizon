
'use server';

import { z } from 'zod';
import { getEventById } from '@/lib/data';
import type { Registration } from '@/lib/types';
import { initializeFirebase } from '@/firebase/init';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { randomUUID } from 'crypto';

const { firestore } = initializeFirebase();


export async function registerForEvent(
  eventId: string,
  data: { [key: string]: unknown }
): Promise<{
  success: boolean;
  registration?: Registration;
  errors?: { [key:string]: string[] } | { _form: string[] };
}> {
  try {
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error('Event not found.');
    }

    // Dynamically build Zod schema from event configuration on the server
    const schemaFields = event.formFields.reduce(
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
    
    // 1. Create QR code document
    const qrCodeData = {
        eventId: event.id,
        eventName: event.name,
        formData: validated.data,
        registrationDate: serverTimestamp(), // Use server timestamp
    };
    const qrDocRef = await addDoc(collection(firestore, "qrcodes"), qrCodeData);

    // 2. Create the main registration document
    const registrationId = `reg_${randomUUID()}`;
    const newRegistrationData: Omit<Registration, 'id'> = {
        eventId: event.id,
        eventName: event.name,
        formData: validated.data,
        qrId: qrDocRef.id,
        registrationDate: new Date().toISOString(), // Keep ISO string for client
    };
    
    // Use the custom registrationId as the document ID
    const registrationDocRef = doc(firestore, 'events', event.id, 'registrations', registrationId);
    await setDoc(registrationDocRef, newRegistrationData);

    const finalRegistration: Registration = {
      ...newRegistrationData,
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
