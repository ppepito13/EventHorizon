
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import type { Registration, Event, User, FormField } from '@/lib/types';
import { randomUUID } from 'crypto';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, collection, writeBatch, getDoc } from 'firebase/firestore';

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
    const tempAppName = `temp-export-app-${randomUUID()}`;
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

        const eventDocRef = doc(tempDb, 'events', eventId);
        const eventSnap = await getDoc(eventDocRef);
        if (!eventSnap.exists()) {
             return { success: false, error: 'Event not found.' };
        }
        const event = eventSnap.data() as Event;

        const registrationsColRef = collection(tempDb, `events/${eventId}/registrations`);
        const snapshot = await getDocs(registrationsColRef);
        const firestoreRegistrations = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Registration));


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
    } finally {
        await deleteApp(tempApp);
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
  
  const tempAppName = `temp-writer-app-${randomUUID()}`;
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

    const eventDocRef = doc(tempDb, 'events', eventId);
    const eventDoc = await getDoc(eventDocRef);

    if (!eventDoc.exists()) {
      return { success: false, message: 'Parent event not found in Firestore.' };
    }
    const firestoreEvent = eventDoc.data()!;
    
    const batch = writeBatch(tempDb);
    for (let i = 0; i < 5; i++) {
        const registrationTime = new Date();
        const formData = generateFakeData(formFields, i);

        const qrId = `qr_${randomUUID()}`;
        const qrDocRef = doc(tempDb, "qrcodes", qrId);
        const qrCodeData = {
            eventId: eventId,
            eventName: firestoreEvent.name,
            formData,
            registrationDate: registrationTime.toISOString(),
        };
        batch.set(qrDocRef, qrCodeData);

        const registrationId = `reg_${randomUUID()}`;
        const newRegistrationData = {
            eventId: eventId,
            eventName: firestoreEvent.name,
            formData: formData,
            qrId: qrId,
            registrationDate: registrationTime.toISOString(),
            eventOwnerId: firestoreEvent.ownerId,
            eventMembers: firestoreEvent.members,
        };
        const registrationDocRef = doc(tempDb, `events/${eventId}/registrations/${registrationId}`);
        batch.set(registrationDocRef, newRegistrationData);
    }
    
    await batch.commit();
    
    revalidatePath('/admin/registrations');

    return { success: true, count: 5 };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown server error occurred.';
    console.error("Generate fake data error:", error);
    return { success: false, message };
  } finally {
      await deleteApp(tempApp);
  }
}

// New, secure server action for deleting registrations
export async function deleteRegistrationAction(eventId: string, registrationId: string) {
  const tempAppName = `temp-deleter-app-${randomUUID()}`;
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
    
    const registrationDocRef = doc(tempDb, `events/${eventId}/registrations/${registrationId}`);
    
    const registrationSnap = await getDoc(registrationDocRef);
    if (!registrationSnap.exists()) {
      throw new Error('Registration not found.');
    }
    const registrationData = registrationSnap.data();
    const qrId = registrationData?.qrId;

    const batch = writeBatch(tempDb);
    batch.delete(registrationDocRef);

    if (qrId) {
      const qrDocRef = doc(tempDb, `qrcodes/${qrId}`);
      batch.delete(qrDocRef);
    }
    
    await batch.commit();

    revalidatePath('/admin/registrations');
    return { success: true, message: 'Registration and associated QR code deleted successfully.' };

  } catch (error: any) {
    console.error("Delete registration error:", error);
    return { success: false, message: error.message || 'An unknown server error occurred.' };
  } finally {
      await deleteApp(tempApp);
  }
}
