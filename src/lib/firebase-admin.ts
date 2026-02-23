import admin from 'firebase-admin';

// This ensures that we are not trying to initialize the app more than once.
// In a secure cloud environment (like Google Cloud Run, where Firebase Studio runs),
// calling initializeApp() with no arguments allows the SDK to automatically
// use the environment's service account credentials and project ID.
// This is the most secure and robust method.
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e: any) {
    console.error('Firebase Admin SDK initialization error', e.stack);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
