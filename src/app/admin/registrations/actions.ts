
'use server';

import { revalidatePath } from 'next/cache';
import { getEventById, getJsonRegistrations, getRegistrationsFromFirestore, deleteJsonRegistration } from '@/lib/data';
import type { Registration } from '@/lib/types';
import { initializeFirebase } from '@/firebase/init';
import { doc, deleteDoc } from 'firebase/firestore';

const { firestore } = initializeFirebase();

export async function deleteRegistrationAction(eventId: string, registrationId: string) {
  if (!eventId || !registrationId) {
    return { success: false, message: 'Event ID and Registration ID are required.' };
  }

  try {
    const registrationDocRef = doc(firestore, 'events', eventId, 'registrations', registrationId);
    await deleteDoc(registrationDocRef).catch(err => {
      console.log(`Note: Registration ${registrationId} not found in Firestore. It may have only existed in the local JSON file.`);
    });
    
    await deleteJsonRegistration(registrationId).catch(err => {
      console.log(`Note: Registration ${registrationId} not found in JSON file. It may have only existed in Firestore.`);
    });

    return { success: true, message: 'Registration deleted successfully.' };
  } catch (error) {
    console.error("Deletion error:", error);
    const message = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return { success: false, message };
  }
}

export async function getJsonRegistrationsAction(eventId: string): Promise<{ success: boolean; data?: Registration[]; error?: string }> {
    if (!eventId) {
        return { success: false, error: 'Event ID is required.' };
    }
    try {
        const data = await getJsonRegistrations(eventId);
        return { success: true, data };
    } catch (error) {
        console.error("Failed to fetch JSON registrations via action:", error);
        return { success: false, error: 'Could not load local registrations.' };
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
        
        // Fetch from both sources
        const firestoreRegistrations = await getRegistrationsFromFirestore(eventId);
        const jsonRegistrationsData = await getJsonRegistrations(eventId);
        
        const combined = [...firestoreRegistrations, ...jsonRegistrationsData];
        const registrations = Array.from(new Map(combined.map(item => [item.id, item])).values());

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
