
import admin from 'firebase-admin';

// This file is the single source of truth for initializing the Firebase Admin SDK on the server.
// It ensures initialization only happens once.

if (!admin.apps.length) {
  try {
    // The persistent error "Credential implementation provided... failed" indicates a conflict
    // between manually provided credentials (even applicationDefault) and the cloud environment's
    // built-in authentication mechanism.

    // The definitive "best practice" in such an environment is to NOT provide a credential object
    // and instead let the SDK auto-discover it, while providing just enough context to ensure
    // it selects the correct project.
    
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('FATAL: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set in the environment.');
    }

    // Initialize without a `credential` property. This forces the SDK to use the environment's
    // service account, while the `projectId` ensures it connects to our intended project,
    // resolving both the credential and "incorrect audience" errors.
    admin.initializeApp({
      projectId: projectId,
    });

  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error);
    // Re-throw a clear, serializable error to be caught by the page.
    // This provides clear debugging info on the login screen.
    throw new Error(`Failed to initialize Firebase Admin SDK. Message: ${error.message}`);
  }
}

// Export the initialized services for use in other server-side modules.
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
