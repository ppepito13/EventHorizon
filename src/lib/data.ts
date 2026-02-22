
import { promises as fs } from 'fs';
import path from 'path';
import { unstable_noStore as noStore } from 'next/cache';
import type { Event, User, Registration } from './types';
import { randomUUID } from 'crypto';

// Use a directory not watched by the dev server for the session file.
const dataDir = path.join(process.cwd(), 'src', 'data');
const eventsFilePath = path.join(dataDir, 'events.json');
const usersFilePath = path.join(dataDir, 'users.json');
const registrationsFilePath = path.join(dataDir, 'registrations.json');

// --- Helper Functions ---
async function readData<T>(filePath: string): Promise<T> {
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

async function writeData<T>(filePath: string, data: T): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing data to ${filePath}:`, error);
    throw new Error(`Could not write data to ${filePath}.`);
  }
}

// --- User Functions ---
export async function getUsers(): Promise<User[]> {
  return await readData<User[]>(usersFilePath);
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
  await writeData(usersFilePath, users);
  return newUser;
}

export async function updateUser(id: string, updateData: Partial<Omit<User, 'id'>>): Promise<User | null> {
  const users = await getUsers();
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) return null;

  const updatedUser = { ...users[userIndex], ...updateData };
  users[userIndex] = updatedUser;
  await writeData(usersFilePath, users);
  return updatedUser;
}

export async function deleteUser(id: string): Promise<boolean> {
  let users = await getUsers();
  const initialLength = users.length;
  users = users.filter(u => u.id !== id);
  if (users.length === initialLength) return false; // No user was deleted
  await writeData(usersFilePath, users);
  return true;
}

// --- Event Functions ---
export async function getEvents(user?: User | null): Promise<Event[]> {
    const events = await readData<Event[]>(eventsFilePath);
    if (user?.role === 'Organizer') {
        if (user.assignedEvents.includes('All')) {
            return events;
        }
        return events.filter(event => user.assignedEvents.includes(event.name));
    }
    // Admins and other roles see all events
    return events;
}

export async function getActiveEvents(): Promise<Event[]> {
  const events = await getEvents();
  return events.filter(event => event.isActive);
}

export async function getEventById(id: string): Promise<Event | null> {
  const events = await getEvents();
  return events.find(event => event.id === id) || null;
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const events = await getEvents();
  return events.find(event => event.slug === slug) || null;
}

export async function createEvent(eventData: Omit<Event, 'id' | 'slug'>): Promise<Event> {
  const events = await getEvents();
  const newEvent: Event = {
    ...eventData,
    id: `evt_${randomUUID()}`,
    slug: eventData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''),
  };
  events.push(newEvent);
  await writeData(eventsFilePath, events);
  return newEvent;
}

export async function updateEvent(id: string, eventData: Partial<Omit<Event, 'id' | 'slug'>>): Promise<Event | null> {
    const events = await getEvents();
    const eventIndex = events.findIndex(e => e.id === id);
    if (eventIndex === -1) return null;

    const slug = eventData.name
        ? eventData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
        : events[eventIndex].slug;
    
    const updatedEvent = { ...events[eventIndex], ...eventData, slug };
    events[eventIndex] = updatedEvent;
    
    await writeData(eventsFilePath, events);
    return updatedEvent;
}

export async function deleteEvent(id: string): Promise<boolean> {
  let events = await getEvents();
  const initialLength = events.length;
  events = events.filter(e => e.id !== id);
  if (events.length === initialLength) return false;
  await writeData(eventsFilePath, events);
  return true;
}

export async function setActiveEvent(id: string): Promise<Event | null> {
    const events = await getEvents();
    let activeEvent: Event | null = null;

    const updatedEvents = events.map(event => {
        if (event.id === id) {
            activeEvent = { ...event, isActive: true };
            return activeEvent;
        }
        if (event.isActive) {
            return { ...event, isActive: false };
        }
        return event;
    });

    if (!activeEvent) throw new Error("Event not found.");

    await writeData(eventsFilePath, updatedEvents);
    return activeEvent;
}

export async function deactivateEvent(id: string): Promise<Event | null> {
    const events = await getEvents();
    let deactivatedEvent: Event | null = null;
    const eventIndex = events.findIndex(e => e.id === id);

    if (eventIndex !== -1) {
        deactivatedEvent = { ...events[eventIndex], isActive: false };
        events[eventIndex] = deactivatedEvent;
        await writeData(eventsFilePath, events);
    }
    
    return deactivatedEvent;
}


// --- Registration Functions ---
export async function getRegistrations(eventId?: string): Promise<Registration[]> {
  const allRegistrations = await readData<Registration[]>(registrationsFilePath);
  if (eventId) {
    return allRegistrations.filter(reg => reg.eventId === eventId);
  }
  return allRegistrations;
}

export async function createRegistration(data: { eventId: string; eventName: string; formData: { [key: string]: any; } }): Promise<Registration> {
  const registrations = await getRegistrations();
  const newRegistration: Registration = {
    ...data,
    id: `reg_${randomUUID()}`,
    registrationDate: new Date().toISOString(),
  };
  registrations.push(newRegistration);
  await writeData(registrationsFilePath, registrations);
  return newRegistration;
}

export async function deleteRegistration(id: string): Promise<boolean> {
  let registrations = await getRegistrations();
  const initialLength = registrations.length;
  registrations = registrations.filter(reg => reg.id !== id);
  if (registrations.length === initialLength) return false;
  await writeData(registrationsFilePath, registrations);
  return true;
}
