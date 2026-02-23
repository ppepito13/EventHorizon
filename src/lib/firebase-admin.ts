import admin from 'firebase-admin';

// This new initialization strategy is a definitive attempt to resolve the
// persistent credential errors on the server.
//
// 1. It explicitly reads the project ID from the same environment variable
//    used by the client-side of the application. This ensures both front-end
//    and back-end are targeting the exact same Firebase project, which is
//    critical for validating authentication tokens.
//
// 2. It does NOT provide a 'credential' property. By only providing the
//    'projectId', we instruct the Admin SDK to connect to the correct project
//    while still using the underlying, automatic credential discovery mechanism
//    of the secure cloud environment. This combination directly addresses the
//    'Credential implementation provided to initializeApp() ... failed' error.

if (!admin.apps.length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!projectId) {
      // If this error is thrown, it means the server environment is missing
      // the necessary configuration, which is a foundational problem.
      throw new Error("CRITICAL: NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not defined on the server.");
    }
    
    admin.initializeApp({
      projectId: projectId,
    });
    
  } catch (e: any) {
    console.error('Firebase Admin SDK initialization error', e.stack);
    // We do not re-throw here, as the action that uses the SDK will fail
    // and report the error, which is more informative to the user.
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
