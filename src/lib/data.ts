
import { promises as fs } from 'fs';
import path from 'path';
import { unstable_noStore as noStore } from 'next/cache';
import type { Event, User, Registration } from './types';
import { randomUUID } from 'crypto';
import { adminDb } from './firebase-admin';

const dataDir = path.join(process.cwd(), 'data');
const usersFilePath = path.join(dataDir, 'users.json');
const eventsFilePath = path.join(dataDir, 'events.json');


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

// --- Event Functions (Now using local JSON file as the Source of Truth) ---

export async function getEvents(user?: User | null): Promise<Event[]> {
    noStore();
    try {
        const events = await readJsonFile<Event[]>(eventsFilePath);

        if (user?.role === 'Organizer' && !user.assignedEvents.includes('All')) {
            return events.filter(event => user.assignedEvents.includes(event.name));
        }
        
        return events;
    } catch (error) {
        console.error("Error fetching events from file:", error);
        return [];
    }
}

export async function getActiveEvents(): Promise<Event[]> {
  noStore();
  try {
    const events = await readJsonFile<Event[]>(eventsFilePath);
    return events.filter(event => event.isActive);
  } catch (error) {
    console.error("Error fetching active events from file:", error);
    return [];
  }
}

export async function getEventById(id: string): Promise<Event | null> {
  noStore();
  const events = await getEvents();
  return events.find(event => event.id === id) || null;
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  noStore();
  const events = await getActiveEvents();
  return events.find(event => event.slug === slug) || null;
}

export async function createEvent(eventData: Omit<Event, 'id' | 'slug' | 'ownerId' | 'members'>, ownerId: string): Promise<Event> {
    const events = await getEvents();
    const slug = eventData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    
    const newEvent: Event = {
        ...eventData,
        id: `evt_${randomUUID()}`,
        slug: slug,
        ownerId: ownerId,
        members: { [ownerId]: 'owner' }
    };
    
    events.push(newEvent);
    await writeJsonFile(eventsFilePath, events);
    return newEvent;
}

export async function updateEvent(id: string, eventData: Partial<Omit<Event, 'id' | 'slug'>>): Promise<Event | null> {
    const events = await getEvents();
    const eventIndex = events.findIndex(e => e.id === id);
    if (eventIndex === -1) {
        return null;
    }

    const slug = eventData.name
        ? eventData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
        : events[eventIndex].slug;
    
    const updatedEvent = { ...events[eventIndex], ...eventData, slug };
    events[eventIndex] = updatedEvent;
    
    await writeJsonFile(eventsFilePath, events);
    return updatedEvent;
}

export async function deleteEvent(id: string): Promise<boolean> {
    let events = await getEvents();
    const initialLength = events.length;
    events = events.filter(e => e.id !== id);
    if (events.length === initialLength) {
        return false;
    }
    await writeJsonFile(eventsFilePath, events);
    return true;
}

export async function setActiveEvent(id: string): Promise<Event | null> {
    const events = await getEvents();
    let activatedEvent: Event | null = null;
    const eventIndex = events.findIndex(e => e.id === id);

    if (eventIndex !== -1) {
        activatedEvent = { ...events[eventIndex], isActive: true };
        events[eventIndex] = activatedEvent;
        await writeJsonFile(eventsFilePath, events);
    }
    
    return activatedEvent;
}

export async function deactivateEvent(id: string): Promise<Event | null> {
    const events = await getEvents();
    let deactivatedEvent: Event | null = null;
    const eventIndex = events.findIndex(e => e.id === id);

    if (eventIndex !== -1) {
        deactivatedEvent = { ...events[eventIndex], isActive: false };
        events[eventIndex] = deactivatedEvent;
        await writeJsonFile(eventsFilePath, events);
    }
    
    return deactivatedEvent;
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
