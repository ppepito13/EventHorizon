
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { getEventById } from '@/lib/data';
import type { Registration, Event, User, FormField } from '@/lib/types';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session';
import { randomUUID } from 'crypto';

export async function getSeedDataAction(): Promise<{ 
    success: boolean; 
    data?: { events: Event[], registrations: Registration[], users: User[] };
    message?: string;
}> {
  try {
    const dataDir = path.join(process.cwd(), 'src', 'data');
    const eventsPath = path.join(dataDir, 'events.json');
    const regsPath = path.join(dataDir, 'registrations.json');
    const usersPath = path.join(dataDir, 'users.json');

    const eventsContent = await fs.readFile(eventsPath, 'utf8');
    const regsContent = await fs.readFile(regsPath, 'utf8');
    const usersContent = await fs.readFile(usersPath, 'utf8');

    const events = JSON.parse(eventsContent);
    const registrations = JSON.parse(regsContent);
    const users = JSON.parse(usersContent);
    
    return { success: true, data: { events, registrations, users } };
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

const FAKE_NAMES = ['Amelia', 'Benjamin', 'Chloe', 'Daniel', 'Evelyn', 'Finn', 'Grace', 'Henry', 'Isabella', 'Jack'];

function generateFakeData(fields: FormField[], index: number) {  
  const name = `${FAKE_NAMES[index % FAKE_NAMES.length]} Testperson${index}`;
  const email = `${name.toLowerCase().replace(/\s/g, '.')}@example.com`;

  const formData: { [key: string]: any } = { rodo: true };

  fields.forEach(field => {
    switch (field.type) {
      case 'text':
        if (field.name.includes('name')) {
          formData[field.name] = name;
        } else if (field.name.includes('url')) {
          formData[field.name] = `https://example.com/${name.split(' ')[0].toLowerCase()}`;
        } else {
          formData[field.name] = `Some text for ${field.label}`;
        }
        break;
      case 'email':
        formData[field.name] = email;
        break;
      case 'tel':
        formData[field.name] = `+48 ${Math.floor(100000000 + Math.random() * 900000000)}`;
        break;
      case 'checkbox':
        formData[field.name] = Math.random() > 0.5;
        break;
      case 'textarea':
        formData[field.name] = `This is some longer fake text for the field: ${field.label}. It is generated for ${name}.`;
        break;
      case 'radio':
        if (field.options && field.options.length > 0) {
          formData[field.name] = field.options[Math.floor(Math.random() * field.options.length)];
        }
        break;
      case 'multiple-choice':
        if (field.options && field.options.length > 0) {
          const numChoices = Math.floor(Math.random() * field.options.length) + 1;
          formData[field.name] = [...field.options].sort(() => 0.5 - Math.random()).slice(0, numChoices);
        }
        break;
      default:
        formData[field.name] = '';
    }
  });

  return formData;
}

export async function generateFakeRegistrationsAction(
  eventId: string, 
  formFields: FormField[]
): Promise<{ success: boolean; message?: string; count?: number }> {

  if (!eventId) {
    return { success: false, message: 'Event ID is required.' };
  }

  try {
    const eventDocRef = adminDb.doc(`events/${eventId}`);
    const eventDoc = await eventDocRef.get();

    if (!eventDoc.exists) {
      return { success: false, message: 'Parent event not found in Firestore.' };
    }
    const firestoreEvent = eventDoc.data()!;
    
    const batch = adminDb.batch();
    for (let i = 0; i < 5; i++) {
        const registrationTime = new Date();
        const formData = generateFakeData(formFields, i);

        // 1. Create QR code doc
        const qrDocRef = adminDb.collection("qrcodes").doc();
        const qrCodeData = {
            eventId: eventId,
            eventName: firestoreEvent.name,
            formData,
            registrationDate: registrationTime.toISOString(),
        };
        batch.set(qrDocRef, qrCodeData);

        // 2. Create Registration doc
        const registrationId = `reg_${randomUUID()}`;
        const newRegistrationData = {
            eventId: eventId,
            eventName: firestoreEvent.name,
            formData: formData,
            qrId: qrDocRef.id,
            registrationDate: registrationTime.toISOString(),
            eventOwnerId: firestoreEvent.ownerId,
            eventMembers: firestoreEvent.members,
        };
        const registrationDocRef = adminDb.doc(`events/${eventId}/registrations/${registrationId}`);
        batch.set(registrationDocRef, newRegistrationData);
    }
    
    await batch.commit();
    
    revalidatePath('/admin/registrations');

    return { success: true, count: 5 };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown server error occurred.';
    console.error("Generate fake data error:", error);
    return { success: false, message };
  }
}

// New, secure server action for deleting registrations
export async function deleteRegistrationAction(eventId: string, registrationId: string) {
  try {
    const session = await getSession();
    const user = session.user;

    // 1. Check if the user is authenticated and is an Administrator
    if (!user || user.role !== 'Administrator') {
      throw new Error('You do not have permission to delete registrations.');
    }

    const registrationDocRef = adminDb.doc(`events/${eventId}/registrations/${registrationId}`);
    
    // 2. Get the document to find the associated qrId
    const registrationSnap = await registrationDocRef.get();
    if (!registrationSnap.exists) {
      throw new Error('Registration not found.');
    }
    const registrationData = registrationSnap.data();
    const qrId = registrationData?.qrId;

    // 3. Perform the deletions in a batch for atomicity
    const batch = adminDb.batch();
    batch.delete(registrationDocRef);

    if (qrId) {
      const qrDocRef = adminDb.doc(`qrcodes/${qrId}`);
      batch.delete(qrDocRef);
    }
    
    await batch.commit();

    // 4. Revalidate the path to update the UI
    revalidatePath('/admin/registrations');
    return { success: true, message: 'Registration and QR code deleted successfully.' };

  } catch (error: any) {
    console.error("Delete registration error:", error);
    return { success: false, message: error.message || 'An unknown server error occurred.' };
  }
}
