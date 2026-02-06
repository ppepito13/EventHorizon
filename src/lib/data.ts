import { promises as fs } from 'fs';
import path from 'path';
import { unstable_noStore as noStore } from 'next/cache';
import type { Event } from './types';

// The path to the JSON file where events are stored.
const eventsFilePath = path.join(process.cwd(), 'data', 'events.json');

/**
 * Reads all events from the JSON file.
 * Caching is disabled to ensure fresh data is always read.
 */
async function readEventsFromFile(): Promise<Event[]> {
  noStore();
  try {
    const fileContent = await fs.readFile(eventsFilePath, 'utf8');
    return JSON.parse(fileContent) as Event[];
  } catch (error) {
    // If file doesn't exist or is empty, return an empty array.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    console.error("Error reading from events.json:", error);
    // In case of other errors (e.g., malformed JSON), we might want to fail loudly
    // but for now, returning an empty array is safer for rendering.
    return [];
  }
}

/**
 * Writes the entire events array to the JSON file.
 */
async function writeEventsToFile(events: Event[]): Promise<void> {
   try {
    // Ensure the directory exists
    await fs.mkdir(path.dirname(eventsFilePath), { recursive: true });
    await fs.writeFile(eventsFilePath, JSON.stringify(events, null, 2), 'utf8');
   } catch(error) {
    console.error("Error writing to events.json:", error);
    throw new Error("Could not save event data.");
   }
}

export async function getEvents(): Promise<Event[]> {
  return await readEventsFromFile();
}

export async function getActiveEvent(): Promise<Event | null> {
  const events = await readEventsFromFile();
  const activeEvent = events.find(event => event.isActive);
  return activeEvent || null;
}

export async function getEventById(id: string): Promise<Event | null> {
  const events = await readEventsFromFile();
  const event = events.find(event => event.id === id);
  return event || null;
}

export async function createEvent(eventData: Omit<Event, 'id' | 'slug'>): Promise<Event> {
  const events = await readEventsFromFile();
  const newEvent: Event = {
    ...eventData,
    id: crypto.randomUUID(),
    slug: eventData.name.toLowerCase().replace(/\s+/g, '-'),
  };
  const updatedEvents = [...events, newEvent];
  await writeEventsToFile(updatedEvents);
  return newEvent;
}

export async function updateEvent(id: string, eventData: Partial<Omit<Event, 'id' | 'slug'>>): Promise<Event | null> {
  const events = await readEventsFromFile();
  let updatedEvent: Event | null = null;
  
  const updatedEvents = events.map(event => {
    if (event.id === id) {
      updatedEvent = {
        ...event,
        ...eventData,
        slug: eventData.name ? eventData.name.toLowerCase().replace(/\s+/g, '-') : event.slug,
      };
      return updatedEvent;
    }
    return event;
  });
  
  if (!updatedEvent) {
    return null;
  }

  await writeEventsToFile(updatedEvents);
  return updatedEvent;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const events = await readEventsFromFile();
  const updatedEvents = events.filter(event => event.id !== id);
  
  if (events.length === updatedEvents.length) {
    return false; // Nothing was deleted
  }

  await writeEventsToFile(updatedEvents);
  return true;
}

export async function setActiveEvent(id: string): Promise<Event | null> {
  const events = await readEventsFromFile();
  let activeEvent: Event | null = null;
  
  const updatedEvents = events.map(event => {
    const shouldBeActive = event.id === id;
    if(shouldBeActive) {
        activeEvent = { ...event, isActive: true };
        return activeEvent;
    }
    // If it's not the one we are activating, ensure it's inactive
    return { ...event, isActive: false };
  });

  if (!activeEvent) {
    return null; // The event ID to activate was not found.
  }

  await writeEventsToFile(updatedEvents);
  return activeEvent;
}

export async function deactivateEvent(id: string): Promise<Event | null> {
    const events = await readEventsFromFile();
    let deactivatedEvent: Event | null = null;
    
    const eventExists = events.some(e => e.id === id);
    if (!eventExists) return null;

    const updatedEvents = events.map(event => {
        if (event.id === id) {
            deactivatedEvent = { ...event, isActive: false };
            return deactivatedEvent;
        }
        return event;
    });

    await writeEventsToFile(updatedEvents);
    return deactivatedEvent;
}
