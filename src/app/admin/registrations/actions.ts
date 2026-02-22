
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { getEventById, getRegistrationsFromFirestore } from '@/lib/data';
import type { Registration } from '@/lib/types';
import { initializeFirebase } from '@/firebase/init';
import { doc, deleteDoc, setDoc } from 'firebase/firestore';

const { firestore } = initializeFirebase();

// Local implementation to avoid client-side bundling of 'fs'
async function getJsonRegistrations(): Promise<Registration[]> {
  const dataDir = path.join(process.cwd(), 'src', 'data');
  const filePath = path.join(dataDir, 'registrations.json');
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    console.error(`Error reading data from ${filePath}:`, error);
    throw new Error(`Could not read data from ${filePath}.`);
  }
}

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
        
        // Use only Firestore as the source of truth
        const firestoreRegistrations = await getRegistrationsFromFirestore(eventId);

        if (firestoreRegistrations.length === 0) {
            return { success: false, error: 'No registrations to export for this event.' };
        }

        const headers = event.formFields.map(field => ({ key: field.name, label: field.label }));
        let csvData = convertToCSV(firestoreRegistrations, headers);

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
      const { id, ...dataToWrite } = reg;
      if (!id || !dataToWrite.eventId) continue;
      
      const regDocRef = doc(firestore, 'events', dataToWrite.eventId, 'registrations', id);
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
