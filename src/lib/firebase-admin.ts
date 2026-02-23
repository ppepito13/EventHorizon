import admin from 'firebase-admin';

// This ensures that we are not trying to initialize the app more than once.
if (!admin.apps.length) {
  try {
    // When running in a Google Cloud environment, we can pass the projectId
    // to ensure the Admin SDK connects to the correct Firebase project.
    // The credentials will still be discovered automatically from the environment.
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (e: any) {
    console.error('Firebase Admin SDK initialization error', e.stack);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
