
import admin from 'firebase-admin';

// This file is the single source of truth for initializing the Firebase Admin SDK on the server.
// It is designed to be imported by any server-side code (Server Actions, API Routes) that needs to
// interact with Firebase services as an administrator.

// It ensures initialization only happens once.
if (!admin.apps.length) {
  try {
    // In this specific cloud environment, the `FIREBASE_CONFIG` environment variable
    // appears to be pre-set with a value that is incompatible with the Admin SDK,
    // leading to the "Credential implementation failed" error.
    //
    // The "best practice" in a Google Cloud environment is to let the Admin SDK
    // auto-discover its credentials from the attached service account. To force this,
    // we temporarily unset `FIREBASE_CONFIG` before initialization.
    const originalFirebaseConfig = process.env.FIREBASE_CONFIG;
    if (originalFirebaseConfig) {
      delete process.env.FIREBASE_CONFIG;
    }

    // With FIREBASE_CONFIG unset, a parameter-less initializeApp() will now correctly
    // use the environment's service account without any conflicting configuration.
    admin.initializeApp();

    // Restore the environment variable after initialization to avoid side effects elsewhere.
    if (originalFirebaseConfig) {
      process.env.FIREBASE_CONFIG = originalFirebaseConfig;
    }
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error);
    // Re-throw a clear, serializable error to be caught by the page.
    throw new Error(`Failed to initialize Firebase Admin SDK. This is a critical server configuration issue. ${error.message}`);
  }
}

// Export the initialized services for use in other server-side modules.
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
