import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * Initializes and returns a singleton instance of Firebase services.
 * This function ensures that Firebase is initialized only once.
 */
export function initializeFirebase() {
  if (getApps().length) {
    // If already initialized, return the existing app's services.
    const app = getApp();
    return getSdks(app);
  }

  // If not initialized, create a new app instance.
  const app = initializeApp(firebaseConfig);
  return getSdks(app);
}

/**
 * A helper function to get all the necessary Firebase SDK instances.
 * @param firebaseApp The initialized FirebaseApp instance.
 * @returns An object containing the Auth and Firestore instances.
 */
function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}
