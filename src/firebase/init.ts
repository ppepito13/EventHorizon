import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * Initializes and returns a singleton instance of the SERVER-SIDE Firebase app.
 * This function ensures that the server-side Firebase app is initialized only once
 * with a unique name to prevent conflicts with any client-side instances.
 */
function initializeServerApp(): FirebaseApp {
  const serverAppName = 'event-horizon-server';
  const apps = getApps();
  const serverApp = apps.find(app => app.name === serverAppName);
  
  if (serverApp) {
    return serverApp;
  }
  
  return initializeApp(firebaseConfig, serverAppName);
}


/**
 * Initializes and returns a singleton instance of Firebase services for server-side use.
 * This function ensures that Firebase is initialized only once.
 */
export function initializeFirebase() {
  const app = initializeServerApp();
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
