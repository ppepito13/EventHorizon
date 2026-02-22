
'use server';

import { revalidatePath } from 'next/cache';
import { initializeFirebase } from '@/firebase/init';
import { doc, updateDoc } from 'firebase/firestore';

export async function updateRegistrationAction(
    eventId: string,
    registrationId: string,
    formData: { [key: string]: any }
) {
  const { firestore } = initializeFirebase();
  if (!eventId || !registrationId) {
    return { success: false, message: 'Event ID and Registration ID are required.' };
  }

  try {
    const registrationDocRef = doc(firestore, 'events', eventId, 'registrations', registrationId);
    
    // We update only the formData field.
    await updateDoc(registrationDocRef, {
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
