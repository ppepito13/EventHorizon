import type { Event } from './types';
import { PlaceHolderImages } from './placeholder-images';

const eventHeroImage = PlaceHolderImages.find(img => img.id === 'event-hero');

// In-memory store for events. This will be replaced by a database in a real application.
// Data is reset on server restart.
let events: Event[] = [
  {
    id: 'clxsb7ncr000008l5heefd3jb',
    name: 'InnovateSphere 2026',
    slug: 'innovatesphere-2026',
    date: 'October 26-28, 2026',
    location: 'Virtual & Global',
    description: 'InnovateSphere is the premier global summit for visionaries, creators, and pioneers. This year, we delve into the future of artificial intelligence, sustainable technology, and the next wave of digital interaction. Join us for three days of groundbreaking keynotes, interactive workshops, and unparalleled networking opportunities with leaders from across the globe.',
    heroImage: {
      src: eventHeroImage?.imageUrl || 'https://picsum.photos/seed/eventhorizon/1200/800',
      hint: eventHeroImage?.imageHint || 'conference stage',
    },
    formFields: [
      { name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'John Doe', required: true },
      { name: 'email', label: 'Email Address', type: 'email', placeholder: 'john.doe@example.com', required: true },
      { name: 'company', label: 'Company / Organization', type: 'text', placeholder: 'Innovate Inc.', required: false },
      { name: 'jobTitle', label: 'Job Title', type: 'text', placeholder: 'Chief Innovation Officer', required: true },
    ],
    rodo: 'By registering, you agree to our terms of service and privacy policy, which outlines how we use and protect your data. You consent to receive event-related communications from EventHorizon and its partners. You can unsubscribe at any time.',
    isActive: true,
  },
  {
    id: 'dlysb7ncr000008l5heefd3jd',
    name: 'Artisan Web Weavers Guild',
    slug: 'artisan-web-weavers-guild',
    date: 'November 12-14, 2026',
    location: 'Online',
    description: 'A gathering of the finest front-end developers and UI/UX designers to share techniques, review work, and push the boundaries of web aesthetics and performance. This is not for the faint of heart.',
    heroImage: {
      src: 'https://picsum.photos/seed/weavers/1200/800',
      hint: 'abstract code',
    },
    formFields: [
      { name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'Jane Doe', required: true },
      { name: 'email', label: 'Email Address', type: 'email', placeholder: 'jane.doe@example.com', required: true },
      { name: 'portfolio', label: 'Portfolio URL', type: 'text', placeholder: 'https://your.portfolio.com', required: true },
    ],
    rodo: 'By signing up, you agree to a public showcase of your submitted portfolio piece and to provide constructive feedback to at least three other participants.',
    isActive: false,
  },
];

export async function getEvents(): Promise<Event[]> {
  // Simulate async operation
  return Promise.resolve(events);
}

export async function getActiveEvent(): Promise<Event | null> {
  const activeEvent = events.find(event => event.isActive);
  return Promise.resolve(activeEvent || null);
}

export async function getEventById(id: string): Promise<Event | null> {
  const event = events.find(event => event.id === id);
  return Promise.resolve(event || null);
}

export async function createEvent(eventData: Omit<Event, 'id' | 'slug'>): Promise<Event> {
  const newEvent: Event = {
    ...eventData,
    id: crypto.randomUUID(),
    slug: eventData.name.toLowerCase().replace(/\s+/g, '-'),
  };
  events.push(newEvent);
  return Promise.resolve(newEvent);
}

export async function updateEvent(id: string, eventData: Partial<Omit<Event, 'id' | 'slug'>>): Promise<Event | null> {
  const eventIndex = events.findIndex(event => event.id === id);
  if (eventIndex === -1) {
    return null;
  }
  
  const updatedEvent = {
    ...events[eventIndex],
    ...eventData,
    slug: eventData.name ? eventData.name.toLowerCase().replace(/\s+/g, '-') : events[eventIndex].slug,
  };
  events[eventIndex] = updatedEvent;

  return Promise.resolve(updatedEvent);
}

export async function deleteEvent(id: string): Promise<boolean> {
  const initialLength = events.length;
  events = events.filter(event => event.id !== id);
  return Promise.resolve(events.length < initialLength);
}

export async function setActiveEvent(id: string): Promise<Event | null> {
  let activeEvent: Event | null = null;
  events.forEach(event => {
    if (event.id === id) {
      event.isActive = true;
      activeEvent = event;
    } else {
      event.isActive = false;
    }
  });
  return Promise.resolve(activeEvent);
}
