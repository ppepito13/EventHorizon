
'use server';

import { revalidatePath } from 'next/cache';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { User } from '@/lib/types';

const usersFilePath = path.join(process.cwd(), 'src', 'data', 'users.json');

async function readUsersFile(): Promise<User[]> {
    try {
        const fileContent = await fs.readFile(usersFilePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error("Error reading users file:", error);
        return [];
    }
}

export async function updateRegistrationAction(
    eventId: string,
    registrationId: string,
    formData: { [key: string]: any }
) {
  if (!eventId || !registrationId) {
    return { success: false, message: 'Event ID and Registration ID are required.' };
  }

  const tempAppName = `temp-update-reg-app-${randomUUID()}`;
  const tempApp = initializeApp(firebaseConfig, tempAppName);

  try {
    const tempAuth = getAuth(tempApp);
    const tempDb = getFirestore(tempApp);
        
    const users = await readUsersFile();
    const adminUser = users.find(u => u.role === 'Administrator');
    if (!adminUser || !adminUser.password) {
        throw new Error('Could not find admin user credentials to perform this action.');
    }
    await signInWithEmailAndPassword(tempAuth, adminUser.email, adminUser.password);

    const registrationDocRef = doc(tempDb, 'events', eventId, 'registrations', registrationId);
    
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
  } finally {
      await deleteApp(tempApp);
  }
}
