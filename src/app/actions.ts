'use server';

import { z } from 'zod';
import { getEventById } from '@/lib/data';

export async function registerForEvent(
  eventId: string,
  data: { [key: string]: unknown }
) {
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
          case 'checkbox':
            zodType = z.boolean();
            break;
          default:
            zodType = z.string();
            break;
        }

        if (field.required) {
          if (field.type === 'text') {
            zodType = zodType.min(1, { message: `${field.label} is required.` });
          }
          if(field.type === 'checkbox'){
            zodType = zodType.refine(val => val === true, { message: `You must accept ${field.label}.` });
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
    
    // In a real application, you would save `validated.data` to a database.
    // For this MVP, we'll just log it to the console.
    console.log('New Registration Successful:', {
      eventId: event.id,
      eventName: event.name,
      registrationData: validated.data,
    });

    return { success: true, data: validated.data };

  } catch (error) {
    console.error('Registration failed:', error);
    return {
      success: false,
      errors: { _form: ['An unexpected error occurred. Please try again.'] },
    };
  }
}
