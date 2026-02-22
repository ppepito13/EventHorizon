import admin from 'firebase-admin';

// This ensures that we are not trying to initialize the app more than once.
if (!admin.apps.length) {
  try {
    // When running in a Google Cloud environment (like Firebase App Hosting or Cloud Run),
    // the Admin SDK can automatically discover the service account credentials.
    // For local development, you would need to set the GOOGLE_APPLICATION_CREDENTIALS
    // environment variable pointing to your service account key file.
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (e: any) {
    console.error('Firebase Admin SDK initialization error', e.stack);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
