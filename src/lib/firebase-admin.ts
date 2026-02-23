import admin from 'firebase-admin';

if (!admin.apps.length) {
  // The root cause of the previous errors was an ambiguity in project
  // auto-discovery within the cloud environment. The Admin SDK was either
  // finding credentials for the wrong project or failing to find credentials
  // when the project was specified.
  //
  // The definitive "best practice" in this scenario is to be explicit about
  // the project ID, while allowing the SDK to automatically find its credentials
  // from the environment. This resolves the conflict.
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    // This is a critical failure condition. The server cannot operate
    // without knowing which project to connect to.
    throw new Error('FATAL: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set in environment variables.');
  }
  
  try {
    admin.initializeApp({
      projectId: projectId,
    });
  } catch (e: any) {
    console.error('Firebase Admin SDK initialization error:', e);
    // We throw the error to ensure that any server action attempting to use a failed
    // admin instance will immediately stop and report the problem clearly.
    throw new Error(`Failed to initialize Firebase Admin SDK. This is a critical server configuration issue. ${e.message}`);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
