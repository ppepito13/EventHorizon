'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  createEvent,
  deleteEvent,
  updateEvent,
  setActiveEvent,
  deactivateEvent,
} from '@/lib/data';
import type { Event } from '@/lib/types';

const eventSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  date: z.string().min(1, 'Date is required.'),
  location: z.string().min(1, 'Location is required.'),
  description: z.string().min(1, 'Description is required.'),
  rodo: z.string().min(1, 'RODO/Privacy policy is required.'),
  heroImageSrc: z.string().url('Hero image source must be a valid URL.'),
  heroImageHint: z.string(),
  formFields: z.string().refine(
    value => {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed);
      } catch (error) {
        return false;
      }
    },
    { message: 'Form fields must be a valid JSON array.' }
  ),
});

export async function createEventAction(data: FormData) {
  const formData = Object.fromEntries(data);
  const validated = eventSchema.safeParse(formData);

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { heroImageSrc, heroImageHint, formFields, ...rest } = validated.data;
  
  const newEventData: Omit<Event, 'id' | 'slug' | 'isActive'> = {
    ...rest,
    heroImage: { src: heroImageSrc, hint: heroImageHint },
    formFields: JSON.parse(formFields),
  };

  await createEvent({ ...newEventData, isActive: false });

  revalidatePath('/admin');
  revalidatePath('/');
  return { success: true };
}

export async function updateEventAction(id: string, data: FormData) {
  const formData = Object.fromEntries(data);
  const validated = eventSchema.safeParse(formData);

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { heroImageSrc, heroImageHint, formFields, ...rest } = validated.data;

  const updatedEventData: Partial<Omit<Event, 'id' | 'slug'>> = {
    ...rest,
    heroImage: { src: heroImageSrc, hint: heroImageHint },
    formFields: JSON.parse(formFields),
  };

  await updateEvent(id, updatedEventData);

  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath(`/admin/events/${id}/edit`);

  return { success: true };
}

export async function deleteEventAction(id: string) {
  try {
    await deleteEvent(id);
    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, message: 'Event deleted successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred.',
    };
  }
}

export async function setActiveEventAction(id: string) {
  try {
    await setActiveEvent(id);
    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, message: 'Event set as active.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred.',
    };
  }
}

export async function deactivateEventAction(id: string) {
    try {
        await deactivateEvent(id);
        revalidatePath('/admin');
        revalidatePath('/');
        return { success: true, message: 'Event deactivated successfully.' };
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'An unknown error occurred.',
        };
    }
}
