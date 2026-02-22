
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { getEventById, getRegistrationsFromFirestore } from '@/lib/data';
import type { Registration, Event } from '@/lib/types';
import { initializeFirebase } from '@/firebase/init';
import { doc, deleteDoc } from 'firebase/firestore';

const { firestore } = initializeFirebase();

export async function getSeedDataAction(): Promise<{ 
    success: boolean; 
    data?: { events: Event[], registrations: Registration[] };
    message?: string;
}> {
  try {
    const dataDir = path.join(process.cwd(), 'src', 'data');
    const eventsPath = path.join(dataDir, 'events.json');
    const regsPath = path.join(dataDir, 'registrations.json');

    const eventsContent = await fs.readFile(eventsPath, 'utf8');
    const regsContent = await fs.readFile(regsPath, 'utf8');

    const events = JSON.parse(eventsContent);
    const registrations = JSON.parse(regsContent);
    
    return { success: true, data: { events, registrations } };
  } catch (error) {
     console.error("Seeding data read error:", error);
     const message = error instanceof Error ? error.message : 'An unknown server error occurred while reading seed data.';
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
