
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
import { getSessionUser } from '@/lib/session';

const eventSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  date: z.string().min(1, 'Date is required.'),
  location: z.string().refine(
    value => {
      try {
        const parsed = JSON.parse(value);
        return typeof parsed === 'object' && parsed !== null && Array.isArray(parsed.types);
      } catch {
        return false;
      }
    }, { message: 'Invalid location data.'}
  ),
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
  isActive: z.preprocess(val => val === 'true', z.boolean()),
});

export async function createEventAction(data: FormData) {
  const user = await getSessionUser();
  if (!user?.uid) {
    return {
      success: false,
      message: 'User is not properly authenticated to create an event.',
    };
  }

  const formData = Object.fromEntries(data);
  const validated = eventSchema.safeParse(formData);

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { heroImageSrc, heroImageHint, formFields, isActive, location, ...rest } = validated.data;
  
  const newEventData: Omit<Event, 'id' | 'slug' | 'ownerId' | 'members'> = {
    ...rest,
    location: JSON.parse(location),
    heroImage: { src: heroImageSrc, hint: heroImageHint },
    formFields: JSON.parse(formFields),
    isActive,
    themeColor: '#3b82f6', // Default theme color
  };

  await createEvent(newEventData, user.uid);

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

  const { heroImageSrc, heroImageHint, formFields, isActive, location, ...rest } = validated.data;

  const updatedEventData: Partial<Omit<Event, 'id' | 'slug'>> = {
    ...rest,
    location: JSON.parse(location),
    heroImage: { src: heroImageSrc, hint: heroImageHint },
    formFields: JSON.parse(formFields),
    isActive,
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
