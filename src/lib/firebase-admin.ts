import admin from 'firebase-admin';
import { getApplicationDefault } from 'firebase-admin/app';

// This ensures that we are not trying to initialize the app more than once.
if (!admin.apps.length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error("FATAL: NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set.");
    }
    
    // Explicitly use Application Default Credentials while overriding the project ID.
    // This forces the SDK to use the environment's authentication mechanism
    // but target it at the correct project. This is the most robust way to
    // handle this in a multi-project cloud environment like Firebase Studio.
    admin.initializeApp({
      credential: getApplicationDefault(),
      projectId: projectId,
      databaseURL: `https://${projectId}.firebaseio.com`,
    });

  } catch (e: any) {
    console.error('Firebase Admin SDK initialization error', e.stack);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
