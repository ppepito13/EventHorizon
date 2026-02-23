
'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase-admin';

export async function updateRegistrationAction(
    eventId: string,
    registrationId: string,
    formData: { [key: string]: any }
) {
  if (!eventId || !registrationId) {
    return { success: false, message: 'Event ID and Registration ID are required.' };
  }

  try {
    const registrationDocRef = adminDb.doc(`events/${eventId}/registrations/${registrationId}`);
    
    // We update only the formData field.
    await registrationDocRef.update({
      formData: formData
    });
    
    revalidatePath('/admin/registrations');
    revalidatePath(`/admin/registrations/${eventId}/${registrationId}/edit`);
    
    return { success: true, message: 'Registration updated successfully.' };
  } catch (error) {
    console.error("Update registration error:", error);
    const message = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return { success: false, message };
  }
}
