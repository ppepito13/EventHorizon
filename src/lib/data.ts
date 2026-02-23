
import { promises as fs } from 'fs';
import path from 'path';
import { unstable_noStore as noStore } from 'next/cache';
import type { Event, User, Registration } from './types';
import { randomUUID } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

// NEW: Import client SDK modules for public data fetching
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';


// Use a directory not watched by the dev server for the session file.
const dataDir = path.join(process.cwd(), 'src', 'data');
const usersFilePath = path.join(dataDir, 'users.json');


// Helper for a one-time, server-side client app instance
const getClientReaderApp = async () => {
    const appName = 'server-side-client-reader';
    const existingApp = getApps().find(app => app.name === appName);
    if (existingApp) {
        const auth = getAuth(existingApp);
        // Ensure we have an authenticated user, even if it's anonymous
        if (!auth.currentUser) await signInAnonymously(auth);
        return existingApp;
    }

    const newApp = initializeApp(firebaseConfig, appName);
    const auth = getAuth(newApp);
    await signInAnonymously(auth);
    return newApp;
};


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

  const updatedUser = { ...users[userIndex], ...updateData };
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

// --- Event Functions (Now using Firestore as the Single Source of Truth) ---

export async function getEvents(user?: User | null): Promise<Event[]> {
    noStore();
    try {
        const eventsColRef = adminDb.collection('events');
        let snapshot;

        if (user?.role === 'Organizer') {
            if (user.assignedEvents.includes('All')) {
                snapshot = await eventsColRef.get();
            } else {
                // Firestore doesn't support 'in' queries with more than 30 items,
                // but for this use case, it's fine.
                if (!user.assignedEvents || user.assignedEvents.length === 0) return [];
                snapshot = await eventsColRef.where('name', 'in', user.assignedEvents).get();
            }
        } else {
            // Admins and other roles see all events
            snapshot = await eventsColRef.get();
        }

        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => doc.data() as Event);
    } catch (error) {
        console.error("Error fetching events from Firestore (Admin SDK):", error);
        return []; // Return empty array to prevent page crash
    }
}

export async function getActiveEvents(): Promise<Event[]> {
  noStore();
  try {
    const app = await getClientReaderApp();
    const db = getFirestore(app);
    const eventsColRef = collection(db, 'events');
    const q = query(eventsColRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => doc.data() as Event);
  } catch (error) {
    console.error("Error fetching active events from Firestore (Client SDK):", error);
    // Gracefully degrade by returning an empty array.
    return [];
  }
}

export async function getEventById(id: string): Promise<Event | null> {
  noStore();
  try {
    const eventDocRef = adminDb.doc(`events/${id}`);
    const docSnap = await eventDocRef.get();
    if (!docSnap.exists) {
      return null;
    }
    return docSnap.data() as Event;
  } catch (error) {
    console.error(`Error fetching event by ID "${id}" from Firestore:`, error);
    return null;
  }
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  noStore();
  try {
    const app = await getClientReaderApp();
    const db = getFirestore(app);
    const eventsColRef = collection(db, 'events');
    const q = query(eventsColRef, where('slug', '==', slug), where('isActive', '==', true));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    return snapshot.docs[0].data() as Event;
  } catch (error) {
    console.error(`Error fetching event by slug "${slug}" from Firestore (Client SDK):`, error);
    return null;
  }
}

export async function createEvent(eventData: Omit<Event, 'id' | 'slug'>): Promise<Event> {
    const id = `evt_${randomUUID()}`;
    const slug = eventData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    const newEvent: Event = {
        ...eventData,
        id,
        slug,
    };

    const eventDocRef = adminDb.doc(`events/${id}`);
    await eventDocRef.set(newEvent);
    return newEvent;
}

export async function updateEvent(id: string, eventData: Partial<Omit<Event, 'id' | 'slug'>>): Promise<Event | null> {
    const eventDocRef = adminDb.doc(`events/${id}`);
    const docSnap = await eventDocRef.get();
    if (!docSnap.exists) {
        return null;
    }

    const slug = eventData.name
        ? eventData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
        : docSnap.data()?.slug;
    
    const updateData = { ...eventData, slug };
    await eventDocRef.update(updateData);
    
    const updatedDoc = await eventDocRef.get();
    return updatedDoc.data() as Event;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const eventDocRef = adminDb.doc(`events/${id}`);
  const docSnap = await eventDocRef.get();
  if (!docSnap.exists) {
      return false;
  }
  await eventDocRef.delete();
  return true;
}

export async function setActiveEvent(id: string): Promise<Event | null> {
    const eventsCol = adminDb.collection('events');
    const batch = adminDb.batch();

    // Deactivate all other events
    const allEventsSnap = await eventsCol.where('isActive', '==', true).get();
    allEventsSnap.docs.forEach(doc => {
        if (doc.id !== id) {
            batch.update(doc.ref, { isActive: false });
        }
    });

    // Activate the selected event
    const eventToActivateRef = eventsCol.doc(id);
    batch.update(eventToActivateRef, { isActive: true });
    
    await batch.commit();

    const updatedDoc = await eventToActivateRef.get();
    return updatedDoc.exists ? updatedDoc.data() as Event : null;
}

export async function deactivateEvent(id: string): Promise<Event | null> {
    const eventDocRef = adminDb.doc(`events/${id}`);
    await eventDocRef.update({ isActive: false });
    const updatedDoc = await eventDocRef.get();
    return updatedDoc.exists ? updatedDoc.data() as Event : null;
}


// --- Registration Functions ---

export async function getRegistrationsFromFirestore(eventId: string): Promise<Registration[]> {
  noStore();
  const registrationsColRef = adminDb.collection(`events/${eventId}/registrations`);
  const snapshot = await registrationsColRef.get();
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Registration));
}


export async function getRegistrationFromFirestore(eventId: string, registrationId: string): Promise<Registration | null> {
  noStore();
  const registrationDocRef = adminDb.doc(`events/${eventId}/registrations/${registrationId}`);
  const docSnap = await registrationDocRef.get();
  if (!docSnap.exists) {
    return null;
  }
  return { id: docSnap.id, ...docSnap.data() } as Registration;
}
