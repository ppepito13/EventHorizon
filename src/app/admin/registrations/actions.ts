
'use server';

import { revalidatePath } from 'next/cache';
import { getEventById, getRegistrationsFromFirestore, deleteJsonRegistration } from '@/lib/data';
import type { Registration } from '@/lib/types';
import { initializeFirebase } from '@/firebase/init';
import { doc, deleteDoc } from 'firebase/firestore';

const { firestore } = initializeFirebase();

export async function deleteRegistrationAction(eventId: string, registrationId: string) {
  if (!eventId || !registrationId) {
    return { success: false, message: 'Event ID and Registration ID are required.' };
  }

  let firestoreSuccess = false;
  let jsonSuccess = false;
  let errorMessage = '';

  // Try deleting from Firestore
  try {
    const registrationDocRef = doc(firestore, 'events', eventId, 'registrations', registrationId);
    await deleteDoc(registrationDocRef);
    firestoreSuccess = true;
  } catch (error) {
    // This is not a critical failure, as the doc might only exist in the JSON file.
    console.error("Firestore delete error (might be expected):", error);
    errorMessage = error instanceof Error ? error.message : 'A Firestore error occurred.';
  }

  // Try deleting from JSON file
  try {
    jsonSuccess = await deleteJsonRegistration(registrationId);
  } catch (error) {
    console.error("JSON delete error:", error);
    errorMessage = error instanceof Error ? error.message : 'A JSON file error occurred.';
  }

  const success = firestoreSuccess || jsonSuccess;

  if (success) {
    // Revalidate path to ensure server components can refetch data.
    // Client components will need to handle their own state updates or reloads.
    revalidatePath('/admin/registrations');
    return { success: true, message: 'Registration deleted successfully.' };
  } else {
    return { success: false, message: `Failed to delete registration. ${errorMessage}` };
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
        
        // Fetch from Firestore
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
