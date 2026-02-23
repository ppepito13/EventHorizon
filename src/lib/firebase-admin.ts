import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // In a managed environment like this, a parameter-less initializeApp() 
    // is the standard approach. It should automatically detect the project 
    // and credentials from the environment. All previous errors stemmed from this 
    // not working as expected, but this remains the "best practice".
    // We are now architecting the app to properly handle any error from this.
    admin.initializeApp();
  } catch (e: any) {
    console.error('Firebase Admin SDK initialization error:', e);
    // This immediate throw will be caught by any server action that imports this file,
    // providing a clear failure point.
    throw new Error(`Failed to initialize Firebase Admin SDK. This is a critical server configuration issue. ${e.message}`);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
