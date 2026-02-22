
'use server';

import { revalidatePath } from 'next/cache';
import { getEventById, getRegistrationsFromFirestore, getJsonRegistrations } from '@/lib/data';
import type { Registration } from '@/lib/types';
import { initializeFirebase } from '@/firebase/init';
import { doc, deleteDoc, setDoc, getDocs, collection } from 'firebase/firestore';

const { firestore } = initializeFirebase();

export async function deleteRegistrationAction(eventId: string, registrationId: string) {
  if (!eventId || !registrationId) {
    return { success: false, message: 'Event ID and Registration ID are required.' };
  }

  try {
    const registrationDocRef = doc(firestore, 'events', eventId, 'registrations', registrationId);
    await deleteDoc(registrationDocRef);
    
    revalidatePath('/admin/registrations');
    
    return { success: true, message: 'Registration deleted successfully.' };
  } catch (error) {
    console.error("Deletion error:", error);
    const message = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return { success: false, message };
  }
}

function convertToCSV(data: Registration[], headers: {key: string, label: string}[]) {
    const headerRow = ['Registration Date', 'QR ID', ...headers.map(h => h.label)].join('|');
    const rows = data.map(reg => {
        const date = reg.registrationDate ? new Date(reg.registrationDate).toLocaleString() : 'N/A';
        const values = [
            date,
            reg.qrId ?? '',
            ...headers.map(h => {
                let value = reg.formData[h.key];
                if (Array.isArray(value)) {
                    value = value.join('; ');
                }
                return value ?? '';
            })
        ];
        return values.join('|');
    });
    return [headerRow, ...rows].join('\n');
}

export async function exportRegistrationsAction(eventId: string, format: 'excel' | 'plain' = 'plain') {
    if (!eventId) {
        return { success: false, error: 'Event ID is required.' };
    }

    try {
        const event = await getEventById(eventId);
        if (!event) {
            return { success: false, error: 'Event not found.' };
        }
        
        const jsonRegistrations = await getJsonRegistrations(eventId);
        const firestoreRegistrations = await getRegistrationsFromFirestore(eventId);
        const allRegistrations = [...jsonRegistrations, ...firestoreRegistrations];

        if (allRegistrations.length === 0) {
            return { success: false, error: 'No registrations to export for this event.' };
        }

        const headers = event.formFields.map(field => ({ key: field.name, label: field.label }));
        let csvData = convertToCSV(allRegistrations, headers);

        if (format === 'excel') {
            csvData = `sep=|\n${csvData}`;
        }

        return { success: true, csvData, eventName: event.name };
    } catch (error) {
        console.error("Export error: ", error);
        return { success: false, error: 'Failed to export data.' };
    }
}


export async function seedRegistrationsFromJSON() {
  try {
    const registrations = await getJsonRegistrations();

    if (registrations.length === 0) {
      return { success: true, message: 'The registrations.json file is empty. No data to seed.' };
    }

    const writePromises = [];
    for (const reg of registrations) {
      // The `id` is used for the document ID, and the rest of the `reg` object (which includes eventId) is used as the data.
      const { id, ...dataToWrite } = reg;
      if (!id || !dataToWrite.eventId) continue; // Skip if essential data is missing
      
      const regDocRef = doc(firestore, 'events', dataToWrite.eventId, 'registrations', id);
      // Use setDoc to either create or overwrite, making the operation idempotent.
      writePromises.push(setDoc(regDocRef, dataToWrite));
    }

    await Promise.all(writePromises);

    revalidatePath('/admin/registrations');
    return { success: true, message: `${registrations.length} registrations successfully seeded to Firestore.` };

  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { success: false, message: 'data/registrations.json not found.' };
    }
    console.error("Seeding error:", error);
    const message = error instanceof Error ? error.message : 'An unknown server error occurred during seeding.';
    return { success: false, message };
  }
}
