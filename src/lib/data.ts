
import { promises as fs } from 'fs';
import path from 'path';
import { unstable_noStore as noStore } from 'next/cache';
import type { Event, User, Registration } from './types';
import { randomUUID } from 'crypto';
import { adminDb } from './firebase-admin';

const dataDir = path.join(process.cwd(), 'data');
const usersFilePath = path.join(dataDir, 'users.json');

// --- Helper Functions ---
async function readJsonFile<T>(filePath: string): Promise<T> {
  noStore(); // Ensures data is fetched on every request
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (filePath.endsWith('.json')) {
        // Provide a default empty array for list-based files
        return [] as unknown as T;
      }
    }
    console.error(`Error reading data from ${filePath}:`, error);
    throw new Error(`Could not read data from ${filePath}.`);
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing data to ${filePath}:`, error);
    throw new Error(`Could not write data to ${filePath}.`);
  }
}

// --- User Functions (reading from JSON for login purposes) ---
export async function getUsers(): Promise<User[]> {
  return await readJsonFile<User[]>(usersFilePath);
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(user => user.id === id) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function createUser(userData: Omit<User, 'id'>): Promise<User> {
  const users = await getUsers();
  const newUser: User = {
    ...userData,
    id: `usr_${randomUUID()}`,
  };
  users.push(newUser);
  await writeJsonFile(usersFilePath, users);
  return newUser;
}

export async function updateUser(id: string, updateData: Partial<Omit<User, 'id'>>): Promise<User | null> {
  const users = await getUsers();
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) return null;

  // Ensure UID is not overwritten if it exists
  const updatedUser = { ...users[userIndex], ...updateData, uid: users[userIndex].uid || updateData.uid };
  users[userIndex] = updatedUser;
  await writeJsonFile(usersFilePath, users);
  return updatedUser;
}

export async function deleteUser(id: string): Promise<boolean> {
  let users = await getUsers();
  const initialLength = users.length;
  users = users.filter(u => u.id !== id);
  if (users.length === initialLength) return false; // No user was deleted
  await writeJsonFile(usersFilePath, users);
  return true;
}

// --- Event Functions (Now using Firestore as the Source of Truth) ---

export async function getEvents(): Promise<Event[]> {
    noStore();
    try {
        const eventsSnapshot = await adminDb.collection('events').get();
        if (eventsSnapshot.empty) {
            return [];
        }
        return eventsSnapshot.docs.map(doc => doc.data() as Event);
    } catch (error) {
        console.error("Error fetching events from Firestore:", error);
        return [];
    }
}

export async function getActiveEvents(): Promise<Event[]> {
  noStore();
  try {
    const eventsSnapshot = await adminDb.collection('events').where('isActive', '==', true).get();
    if (eventsSnapshot.empty) {
        return [];
    }
    return eventsSnapshot.docs.map(doc => doc.data() as Event);
  } catch (error) {
    console.error("Error fetching active events from Firestore:", error);
    return [];
  }
}

export async function getEventById(id: string): Promise<Event | null> {
  noStore();
  try {
    const eventDoc = await adminDb.collection('events').doc(id).get();
    if (!eventDoc.exists) {
        return null;
    }
    return eventDoc.data() as Event;
  } catch (error) {
      console.error(`Error fetching event by ID ${id} from Firestore:`, error);
      return null;
  }
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  noStore();
  try {
    const eventsSnapshot = await adminDb.collection('events').where('slug', '==', slug).limit(1).get();
    if (eventsSnapshot.empty) {
        return null;
    }
    return eventsSnapshot.docs[0].data() as Event;
  } catch (error) {
    console.error(`Error fetching event by slug ${slug} from Firestore:`, error);
    return null;
  }
}

export async function createEvent(eventData: Omit<Event, 'id' | 'slug' | 'ownerId' | 'members'>, ownerId: string): Promise<Event> {
    const slug = eventData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    const eventId = `evt_${randomUUID()}`;
    
    const newEvent: Event = {
        ...eventData,
        id: eventId,
        slug: slug,
        ownerId: ownerId,
        members: { [ownerId]: 'owner' }
    };
    
    await adminDb.collection('events').doc(eventId).set(newEvent);
    return newEvent;
}

export async function updateEvent(id: string, eventData: Partial<Omit<Event, 'id' | 'slug'>>): Promise<Event | null> {
    const eventRef = adminDb.collection('events').doc(id);
    
    const slug = eventData.name
        ? eventData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
        : undefined;

    const updatePayload: { [key: string]: any } = { ...eventData };
    if (slug) {
        updatePayload.slug = slug;
    }

    await eventRef.update(updatePayload);
    
    const updatedDoc = await eventRef.get();
    return updatedDoc.data() as Event;
}

export async function deleteEvent(id: string): Promise<boolean> {
    try {
        await adminDb.collection('events').doc(id).delete();
        return true;
    } catch (error) {
        console.error(`Error deleting event ${id} from Firestore:`, error);
        return false;
    }
}

// --- Registration Functions ---

export async function getRegistrationsFromFirestore(eventId: string): Promise<Registration[]> {
  noStore();
  try {
    const registrationsColRef = adminDb.collection(`events/${eventId}/registrations`);
    const snapshot = await registrationsColRef.get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Registration));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown server error occurred.';
    console.error("getRegistrationsFromFirestore error:", error);
    throw new Error(message);
  }
}


export async function getRegistrationFromFirestore(eventId: string, registrationId: string): Promise<Registration | null> {
  noStore();
  try {
    const registrationDocRef = adminDb.doc(`events/${eventId}/registrations/${registrationId}`);
    const docSnap = await registrationDocRef.get();
    if (!docSnap.exists) {
      return null;
    }
    return { id: docSnap.id, ...docSnap.data() } as Registration;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown server error occurred.';
    console.error("getRegistrationFromFirestore error:", error);
    throw new Error(message);
  }
}
