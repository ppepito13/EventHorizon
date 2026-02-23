
'use server';

import { revalidatePath } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { User, Registration, Event } from '@/lib/types';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { 
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    getDoc
} from 'firebase/firestore';

const dataDir = path.join(process.cwd(), 'src', 'data');
const usersFilePath = path.join(dataDir, 'users.json');

async function readUsersFile(): Promise<User[]> {
    try {
        const fileContent = await fs.readFile(usersFilePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error("Error reading users file:", error);
        return [];
    }
}

async function performFirestoreOperation(operation: (db: any) => Promise<any>) {
    const tempAppName = `temp-check-in-app-${randomUUID()}`;
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

        return await operation(tempDb);
    } finally {
        await deleteApp(tempApp);
    }
}


export async function checkInUserByQrId(eventId: string, qrId: string) {
  try {
    const result = await performFirestoreOperation(async (db) => {
        const registrationsRef = collection(db, 'events', eventId, 'registrations');
        const q = query(registrationsRef, where('qrId', '==', qrId));
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: 'Registration not found.' };
        }

        const registrationDoc = querySnapshot.docs[0];
        const registrationData = registrationDoc.data() as Registration;

        if (registrationData.checkedIn) {
            const checkInTime = registrationData.checkInTime ? new Date(registrationData.checkInTime).toLocaleString() : '';
            return { 
                success: false, 
                message: `User already checked in at ${checkInTime}.`,
                userName: registrationData.formData.full_name || 'N/A'
            };
        }

        await updateDoc(registrationDoc.ref, {
            checkedIn: true,
            checkInTime: new Date().toISOString()
        });
        
        return { 
            success: true, 
            message: 'Check-in successful!',
            userName: registrationData.formData.full_name || 'N/A'
        };
    });
    
    if (result.success) {
      revalidatePath('/admin/check-in');
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown server error occurred.';
    console.error("Check-in error:", error);
    return { success: false, message };
  }
}

export async function toggleCheckInStatus(eventId: string, registrationId: string, newStatus: boolean) {
    try {
        const result = await performFirestoreOperation(async (db) => {
            const registrationRef = doc(db, 'events', eventId, 'registrations', registrationId);
            
            await updateDoc(registrationRef, {
                checkedIn: newStatus,
                checkInTime: newStatus ? new Date().toISOString() : null
            });
            
            return { success: true };
        });
        
        revalidatePath('/admin/check-in');
        return result;

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown server error occurred.';
        console.error("Toggle check-in error:", error);
        return { success: false, message };
    }
}


function convertCheckInToCSV(data: Registration[], headers: {key: string, label: string}[]) {
    const headerRow = [
        'Registration Date',
        ...headers.map(h => h.label),
        'Checked-In Status',
        'Check-In Time'
    ].join('|');

    const rows = data.map(reg => {
         const date = reg.registrationDate ? new Date(reg.registrationDate).toLocaleString() : 'N/A';
         const checkInStatus = reg.checkedIn ? 'YES' : 'NO';
         const checkInTime = reg.checkedIn && reg.checkInTime ? new Date(reg.checkInTime).toLocaleString() : 'N/A';
         const formValues = headers.map(h => {
                let value = reg.formData[h.key];
                if (Array.isArray(value)) {
                    value = value.join('; ');
                }
                if (typeof value === 'boolean') {
                    return value ? 'Yes' : 'No';
                }
                return value ?? '';
            });
         
         const values = [
            date,
            ...formValues,
            checkInStatus,
            checkInTime
         ];
         return values.join('|');
    });

    return [headerRow, ...rows].join('\n');
}

export async function exportCheckedInAttendeesAction(eventId: string, format: 'excel' | 'plain' = 'plain') {
    if (!eventId) {
        return { success: false, error: 'Event ID is required.' };
    }

    try {
        const result = await performFirestoreOperation(async (db) => {
            const eventDocRef = doc(db, 'events', eventId);
            const eventSnap = await getDoc(eventDocRef);
            if (!eventSnap.exists()) {
                 return { success: false, error: 'Event not found in Firestore.' };
            }
            const event = eventSnap.data() as Event;

            const registrationsColRef = collection(db, `events/${eventId}/registrations`);
            const snapshot = await getDocs(registrationsColRef);
            const firestoreRegistrations = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Registration));

            if (firestoreRegistrations.length === 0) {
                return { success: false, error: 'No registrations to export for this event.' };
            }
            
            const headers = event.formFields.map(field => ({ key: field.name, label: field.label }));
            
            let csvData = convertCheckInToCSV(firestoreRegistrations, headers);

            if (format === 'excel') {
                csvData = `sep=|\n${csvData}`;
            }

            return { success: true, csvData, eventName: event.name };
        });
        
        return result;

    } catch (error) {
        console.error("Export error: ", error);
        const message = error instanceof Error ? error.message : 'Failed to export data.';
        return { success: false, error: message };
    }
}
