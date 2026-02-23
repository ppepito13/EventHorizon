
import admin from 'firebase-admin';

// This file is the single source of truth for initializing the Firebase Admin SDK on the server.
// It ensures initialization only happens once.

if (!admin.apps.length) {
  try {
    // In this specific cloud environment, auto-discovery of credentials has been unreliable.
    // The error "Credential implementation provided ... failed to fetch a valid Google OAuth2 access token"
    // suggests a conflict between credentials found in environment variables (like FIREBASE_CONFIG)
    // and the expected credentials from the service account.

    // This new strategy is a robust, explicit approach to resolve the conflict:
    // 1. Temporarily unset FIREBASE_CONFIG to prevent the SDK from using it.
    // 2. Explicitly initialize with Application Default Credentials (ADC).
    // 3. Explicitly provide the projectId to ensure the credentials are used for the correct project.

    const originalFirebaseConfig = process.env.FIREBASE_CONFIG;
    if (originalFirebaseConfig) {
      delete process.env.FIREBASE_CONFIG;
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('FATAL: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set in the environment.');
    }

    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: projectId,
    });

    // Restore the environment variable after initialization to avoid potential side effects.
    if (originalFirebaseConfig) {
      process.env.FIREBASE_CONFIG = originalFirebaseConfig;
    }

  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error);
    // Re-throw a clear, serializable error to be caught by the page.
    throw new Error(`Failed to initialize Firebase Admin SDK. This is a critical server configuration issue. Message: ${error.message}`);
  }
}

// Export the initialized services for use in other server-side modules.
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
