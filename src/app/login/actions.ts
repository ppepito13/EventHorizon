
'use server';

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getUsers } from '@/lib/data';
import type { Event, User } from '@/lib/types';
import path from 'path';
import { promises as fs } from 'fs';

export interface SeedResult {
  success: boolean;
  message: string;
}

async function seedEventsIntoFirestore() {
  const dataDir = path.join(process.cwd(), 'src', 'data');
  const eventsPath = path.join(dataDir, 'events.json');
  const eventsContent = await fs.readFile(eventsPath, 'utf8');
  const events: Event[] = JSON.parse(eventsContent);

  const batch = adminDb.batch();
  let seededCount = 0;

  for (const event of events) {
    const eventRef = adminDb.doc(`events/${event.id}`);
    const docSnap = await eventRef.get();
    if (!docSnap.exists) {
      batch.set(eventRef, event);
      seededCount++;
    }
  }

  if (seededCount > 0) {
    await batch.commit();
  }

  return { seededCount, totalJsonEvents: events.length };
}


export async function seedAuthUsersAction(): Promise<SeedResult> {
  try {
    const users = await getUsers();
    if (!users || users.length === 0) {
      return { success: false, message: 'No demo users found in data file.' };
    }

    // Part 1: Seed Firebase Authentication users
    let createdAuthCount = 0;
    let existingAuthCount = 0;
    const authErrors: string[] = [];

    for (const user of users) {
      if (!user.email || !user.password) continue;

      try {
        await adminAuth.getUserByEmail(user.email);
        existingAuthCount++;
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          try {
            await adminAuth.createUser({
              email: user.email,
              password: user.password,
              displayName: user.name,
              disabled: false,
            });
            createdAuthCount++;
          } catch (createError: any) {
            authErrors.push(`Failed to create ${user.email}: ${createError.message}`);
          }
        } else {
          // This is a different kind of error, likely an initialization or network issue.
          // Capture its details for the final error message.
          authErrors.push(`Error checking ${user.email}: ${error.message}`);
        }
      }
    }
    
    // If any auth checks failed with a non-'user-not-found' error, we should stop and report.
    if (authErrors.length > 0) {
      // Throw a single error that aggregates all the issues.
      throw new Error(`Seeding complete. Created: ${createdAuthCount}, Already existed: ${existingAuthCount}. Errors: ${authErrors.join(', ')}`);
    }

    // Part 2: Seed Firestore events
    const { seededCount, totalJsonEvents } = await seedEventsIntoFirestore();

    const authMessage = `Auth users - Created: ${createdAuthCount}, Existed: ${existingAuthCount}.`;
    const firestoreMessage = `Firestore events - Seeded: ${seededCount}/${totalJsonEvents}.`;
    const finalMessage = `${authMessage} ${firestoreMessage}`;

    return { success: true, message: finalMessage };

  } catch (error: any) {
    // This will catch errors from the initial setup (like `getUsers`) 
    // or the aggregated error thrown from the user loop above.
    console.error("Critical error in seedAuthUsersAction:", error);
    // Re-throw a new, plain Error object to ensure it's serializable
    // and can be caught properly by the Server Component.
    throw new Error(error.message || 'An unknown server error occurred during seeding.');
  }
}
