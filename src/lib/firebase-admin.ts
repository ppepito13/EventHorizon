import admin from 'firebase-admin';

// This ensures that we are not trying to initialize the app more than once.
if (!admin.apps.length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error("FATAL: NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set.");
    }
    
    // When running in a Google Cloud environment, we must pass configuration to ensure
    // the Admin SDK connects to the correct Firebase project, overriding any potential
    // environment defaults. This is critical for fixing "audience" claim mismatches and
    // credential discovery issues.
    admin.initializeApp({
      projectId: projectId,
      // Explicitly setting the databaseURL helps the SDK to unambiguously resolve the correct
      // project resources, which is crucial in some multi-project cloud environments.
      databaseURL: `https://${projectId}.firebaseio.com`,
    });
  } catch (e: any) {
    console.error('Firebase Admin SDK initialization error', e.stack);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
