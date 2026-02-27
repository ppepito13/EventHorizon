
/**
 * @fileOverview Data Access Layer (DAL) for the EventHorizon project.
 * Handles dual-source data management: JSON files for legacy/development user data,
 * and Cloud Firestore for production-ready events and registrations.
 *
 * TODO: Migrate all JSON-based user management to Firestore /app_admins and /users collections
 * to ensure consistency and proper security rules enforcement across all environments.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { unstable_noStore as noStore } from 'next/cache';
import type { Event, User, Registration } from './types';
import { randomUUID } from 'crypto';
import { adminDb } from './firebase-admin';

const dataDir = path.join(process.cwd(), 'data');
const usersFilePath = path.join(dataDir, 'users.json');

// --- Helper Functions ---

/**
 * Reads and parses a JSON file.
 * @template T
 * @param {string} filePath - Absolute path to the JSON file.
 * @returns {Promise<T>} Parsed JSON content.
 * @throws {Error} If reading or parsing fails.
 */
async function readJsonFile<T>(filePath: string): Promise<T> {
  noStore(); // Ensures data is fetched on every request, avoiding Next.js static optimization for local data.
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (filePath.endsWith('.json')) {
        // Provide a default empty array for list-based files to prevent crash on first run.
        return [] as unknown as T;
      }
    }
    console.error(`Error reading data from ${filePath}:`, error);
    throw new Error(`Could not read data from ${filePath}.`);
  }
}

/**
 * Writes data to a JSON file with pretty formatting.
 * @template T
 * @param {string} filePath - Absolute path to the target JSON file.
 * @param {T} data - The data structure to persist.
 * @returns {Promise<void>}
 */
async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing data to ${filePath}:`, error);
    throw new Error(`Could not write data to ${filePath}.`);
  }
}

// --- User Functions (reading from JSON for login purposes) ---

/**
 * Retrieves all users from the legacy JSON database.
 * @returns {Promise<User[]>} Array of User objects.
 */
export async function getUsers(): Promise<User[]> {
  return await readJsonFile<User[]>(usersFilePath);
}

/**
 * Finds a single user by their internal system ID.
 * @param {string} id - The usr_ prefixed UUID.
 * @returns {Promise<User | null>} The user object or null if not found.
 */
export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(user => user.id === id) || null;
}

/**
 * Finds a user by their email address (case-insensitive).
 * Used during the authentication handshake.
 * @param {string} email
 * @returns {Promise<User | null>}
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Persists a new user to the local JSON file.
 * @param {Omit<User, 'id'>} userData
 * @returns {Promise<User>} The newly created user with a generated ID.
 */
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

/**
 * Updates an existing user record in the JSON file.
 * @param {string} id
 * @param {Partial<Omit<User, 'id'>>} updateData
 * @returns {Promise<User | null>} Updated user object.
 */
export async function updateUser(id: string, updateData: Partial<Omit<User, 'id'>>): Promise<User | null> {
  const users = await getUsers();
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) return null;

  // Ensure UID (from Firebase Auth) is preserved if already set.
  const updatedUser = { ...users[userIndex], ...updateData, uid: users[userIndex].uid || updateData.uid };
  users[userIndex] = updatedUser;
  await writeJsonFile(usersFilePath, users);
  return updatedUser;
}

/**
 * Removes a user record from the system.
 * @param {string} id
 * @returns {Promise<boolean>} True if user was found and deleted.
 */
export async function deleteUser(id: string): Promise<boolean> {
  let users = await getUsers();
  const initialLength = users.length;
  users = users.filter(u => u.id !== id);
  if (users.length === initialLength) return false; 
  await writeJsonFile(usersFilePath, users);
  return true;
}

/**
 * Replaces the entire users database with a new array.
 * Typically used for purge/bulk generation operations.
 * @param {User[]} users
 */
export async function overwriteUsers(users: User[]): Promise<void> {
  await writeJsonFile(usersFilePath, users);
}

// --- Event Functions (Now using Firestore as the Source of Truth) ---

/**
 * Fetches all events from Cloud Firestore.
 * Uses the Admin SDK to bypass security rules for administrative queries.
 * @returns {Promise<Event[]>}
 */
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

/**
 * Retrieves only events marked as active for the public homepage.
 * @returns {Promise<Event[]>}
 */
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

/**
 * Fetches event metadata by its unique Firestore document ID.
 * @param {string} id
 * @returns {Promise<Event | null>}
 */
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

/**
 * Retrieves an event by its URL-friendly slug.
 * @param {string} slug
 * @returns {Promise<Event | null>}
 */
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


// --- Registration Functions ---

/**
 * Retrieves all participant registrations for a specific event.
 * Access is usually restricted via firestore.rules to organizers/admins.
 * @param {string} eventId
 * @returns {Promise<Registration[]>}
 */
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


/**
 * Fetches a single registration record.
 * @param {string} eventId
 * @param {string} registrationId
 * @returns {Promise<Registration | null>}
 */
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
