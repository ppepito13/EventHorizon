import admin from 'firebase-admin';

// This ensures that we are not trying to initialize the app more than once.
if (!admin.apps.length) {
  try {
    // When running in a Google Cloud environment (like Firebase App Hosting or Cloud Run),
    // calling initializeApp() with no arguments allows the Admin SDK to automatically
    // discover credentials and other configuration. This is the recommended approach.
    admin.initializeApp();
  } catch (e: any) {
    console.error('Firebase Admin SDK initialization error', e.stack);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
