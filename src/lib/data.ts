
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';

import { initializeFirebase } from '@/firebase';

import { unstable_noStore as noStore } from 'next/cache';
import type { Event, User, Registration } from './types';
import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';

// Initialize Firebase
const { firestore } = initializeFirebase();

/**
 * Reads all users from Firestore.
 */
export async function getUsers(): Promise<User[]> {
  noStore();
  const usersCol = collection(firestore, 'users');
  const snapshot = await getDocs(usersCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

/**
 * Reads a single user from Firestore by ID.
 */
export async function getUserById(id: string): Promise<User | null> {
  noStore();
  const userDocRef = doc(firestore, 'users', id);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as User;
  }
  return null;
}

/**
 * Reads a single user from Firestore by email.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  noStore();
  const usersCol = collection(firestore, 'users');
  const q = query(usersCol, where('email', '==', email.toLowerCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const userDoc = snapshot.docs[0];
  return { id: userDoc.id, ...userDoc.data() } as User;
}

/**
 * Reads events from Firestore, filtered by user access.
 */
export async function getEvents(user?: User | null): Promise<Event[]> {
  noStore();
  const eventsCol = collection(firestore, 'events');
  const snapshot = await getDocs(eventsCol);
  const allEvents = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, slug: doc.data().slug || doc.id } as Event));

  if (user?.role === 'Organizer') {
    if (user.assignedEvents.includes('All')) {
      return allEvents;
    }
    return allEvents.filter(event => user.assignedEvents.includes(event.name));
  }
  return allEvents;
}

/**
 * Reads all active events from Firestore.
 */
export async function getActiveEvents(): Promise<Event[]> {
  noStore();
  const eventsCol = collection(firestore, 'events');
  const q = query(eventsCol, where('isActive', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, slug: doc.data().slug || doc.id } as Event));
}

/**
 * Reads a single event from Firestore by ID.
 */
export async function getEventById(id: string): Promise<Event | null> {
  noStore();
  const eventDocRef = doc(firestore, 'events', id);
  const docSnap = await getDoc(eventDocRef);
  if (docSnap.exists()) {
    return { ...docSnap.data(), id: docSnap.id, slug: docSnap.data().slug || docSnap.id } as Event;
  }
  return null;
}

/**
 * Reads a single event from Firestore by slug.
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  noStore();
  const eventsCol = collection(firestore, 'events');
  const q = query(eventsCol, where('slug', '==', slug));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const eventDoc = snapshot.docs[0];
  return { ...eventDoc.data(), id: eventDoc.id, slug: eventDoc.data().slug || eventDoc.id } as Event;
}

/**
 * Creates a new event in Firestore.
 */
export async function createEvent(
  eventData: Omit<Event, 'id' | 'slug'>
): Promise<Event> {
  const newDocRef = doc(collection(firestore, 'events'));
  const slug = eventData.name.toLowerCase().replace(/\s+/g, '-');
  const newEvent: Event = {
    ...eventData,
    id: newDocRef.id,
    slug,
  };
  addDocumentNonBlocking(collection(firestore, 'events'), newEvent);
  return newEvent;
}

/**
 * Updates an event in Firestore.
 */
export async function updateEvent(
  id: string,
  eventData: Partial<Omit<Event, 'id' | 'slug'>>
): Promise<Event | null> {
  const eventDocRef = doc(firestore, 'events', id);
  const slug = eventData.name ? eventData.name.toLowerCase().replace(/\s+/g, '-') : undefined;
  
  const updateData = { ...eventData };
  if (slug) {
    (updateData as Event).slug = slug;
  }

  updateDocumentNonBlocking(eventDocRef, updateData);
  const updatedDoc = await getDoc(eventDocRef);
  if (updatedDoc.exists()) {
    return { ...updatedDoc.data(), id: updatedDoc.id } as Event
  }
  return null
}

/**
 * Deletes an event from Firestore.
 */
export async function deleteEvent(id: string): Promise<boolean> {
  const eventDocRef = doc(firestore, 'events', id);
  deleteDocumentNonBlocking(eventDocRef);
  return true;
}

/**
 * Sets an event to active in Firestore.
 */
export async function setActiveEvent(id: string): Promise<Event | null> {
    const events = await getEvents();
    const batch = writeBatch(firestore);

    let activeEvent: Event | null = null;
    
    events.forEach(event => {
        const eventRef = doc(firestore, "events", event.id);
        if (event.id === id) {
            batch.update(eventRef, { isActive: true });
            activeEvent = { ...event, isActive: true };
        } else if (event.isActive) {
            // Deactivate any other currently active event
            batch.update(eventRef, { isActive: false });
        }
    });

    if (!activeEvent) {
        // If the event to be activated wasn't in the list, it's an error.
        throw new Error("Event not found.");
    }

    await batch.commit();
    return activeEvent;
}

/**
 * Deactivates an event in Firestore.
 */
export async function deactivateEvent(id: string): Promise<Event | null> {
  const eventDocRef = doc(firestore, 'events', id);
  updateDocumentNonBlocking(eventDocRef, { isActive: false });
  const updatedDoc = await getDoc(eventDocRef);
  if(updatedDoc.exists()) {
      return { ...updatedDoc.data(), id: updatedDoc.id } as Event;
  }
  return null;
}

/**
 * Creates a new user in Firestore.
 */
export async function createUser(userData: Omit<User, 'id'>): Promise<User> {
  const newUserRef = doc(collection(firestore, 'users'));
  const newUser: User = {
    ...userData,
    id: newUserRef.id,
  };
  addDocumentNonBlocking(collection(firestore, 'users'), newUser);
  return newUser;
}

/**
 * Updates a user in Firestore.
 */
export async function updateUser(id: string, userData: Partial<Omit<User, 'id' | 'password'>> & { password?: string }): Promise<User | null> {
  const userDocRef = doc(firestore, 'users', id);
  const updateData = { ...userData };
  if(!updateData.password) {
      delete updateData.password;
  }
  updateDocumentNonBlocking(userDocRef, updateData);

  const updatedDoc = await getDoc(userDocRef);
  if(updatedDoc.exists()){
      return { ...updatedDoc.data(), id: updatedDoc.id } as User;
  }

  return null;
}

/**
 * Deletes a user from Firestore.
 */
export async function deleteUser(id: string): Promise<boolean> {
  const userDocRef = doc(firestore, 'users', id);
  deleteDocumentNonBlocking(userDocRef);
  return true;
}

/**
 * Reads registrations from Firestore, optionally filtered by eventId.
 */
export async function getRegistrations(eventId?: string): Promise<Registration[]> {
  noStore();
  const registrationsCol = collection(firestore, 'registrations');
  let q = query(registrationsCol);
  if (eventId) {
    q = query(registrationsCol, where('eventId', '==', eventId));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
}

/**
 * Creates a new registration in Firestore.
 */
export async function createRegistration(data: { eventId: string; eventName: string; formData: { [key: string]: any; } }): Promise<Registration> {
  const newRegRef = doc(collection(firestore, 'registrations'));
  const newRegistration: Registration = {
    ...data,
    id: newRegRef.id,
    registrationDate: new Date().toISOString(),
  };
  
  addDocumentNonBlocking(collection(firestore, 'registrations'), {
    ...data,
    id: newRegRef.id,
    registrationDate: serverTimestamp(),
  });
  
  return newRegistration;
}

/**
 * Deletes a registration from Firestore.
 */
export async function deleteRegistration(id: string): Promise<boolean> {
  const regDocRef = doc(firestore, 'registrations', id);
  deleteDocumentNonBlocking(regDocRef);
  return true;
}
