
'use server';

import { revalidatePath } from 'next/cache';
import { getEventById, getRegistrationsFromFirestore } from '@/lib/data';
import type { Registration } from '@/lib/types';
import { initializeFirebase } from '@/firebase/init';
import { doc, deleteDoc, setDoc } from 'firebase/firestore';
import { promises as fs } from 'fs';
import path from 'path';

const { firestore } = initializeFirebase();

export async function deleteRegistrationAction(eventId: string, registrationId: string) {
  if (!eventId || !registrationId) {
    return { success: false, message: 'Event ID and Registration ID are required.' };
  }

  try {
    const registrationDocRef = doc(firestore, 'events', eventId, 'registrations', registrationId);
    await deleteDoc(registrationDocRef);
    
    // The UI will update in real-time via the listener, but revalidation is good practice.
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
        
        const registrations = await getRegistrationsFromFirestore(eventId);

        if (registrations.length === 0) {
            return { success: false, error: 'No registrations to export for this event.' };
        }

        const headers = event.formFields.map(field => ({ key: field.name, label: field.label }));
        let csvData = convertToCSV(registrations, headers);

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
    const registrationsFilePath = path.join(process.cwd(), 'src', 'data', 'registrations.json');
    const fileContent = await fs.readFile(registrationsFilePath, 'utf8');
    const registrations: Registration[] = JSON.parse(fileContent);

    if (registrations.length === 0) {
      return { success: true, message: 'The registrations.json file is empty. No data to seed.' };
    }

    const writePromises = [];
    for (const reg of registrations) {
      const { id, eventId, ...regData } = reg;
      if (!id || !eventId) continue; // Skip if essential data is missing
      
      const regDocRef = doc(firestore, 'events', eventId, 'registrations', id);
      // Use setDoc to either create or overwrite, making the operation idempotent.
      writePromises.push(setDoc(regDocRef, regData));
    }

    await Promise.all(writePromises);
    
    // Optional: We can clear the file after seeding to prevent running it again,
    // but for now we'll leave it so it can be re-seeded if needed.
    // await fs.writeFile(registrationsFilePath, JSON.stringify([], null, 2), 'utf8');

    revalidatePath('/admin/registrations');
    return { success: true, message: `${registrations.length} registrations successfully seeded to Firestore.` };

  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { success: false, message: 'registrations.json not found.' };
    }
    console.error("Seeding error:", error);
    const message = error instanceof Error ? error.message : 'An unknown server error occurred during seeding.';
    return { success: false, message };
  }
}
