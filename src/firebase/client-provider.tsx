
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// This function ensures a singleton instance of a uniquely named Firebase app on the client-side.
// This prevents conflicts with any server-side Firebase instances.
function initializeClientApp(): FirebaseApp {
  const clientAppName = 'event-horizon-client';
  const apps = getApps();
  const clientApp = apps.find(app => app.name === clientAppName);
  
  if (clientApp) {
    return clientApp;
  }
  
  return initializeApp(firebaseConfig, clientAppName);
}


interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    try {
        const app = initializeClientApp();
        return {
            firebaseApp: app,
            auth: getAuth(app),
            firestore: getFirestore(app),
        };
    } catch (error: any) {
        if (error.code === 'auth/invalid-api-key') {
            throw new Error(
                '----------------------------------------------------------------\n' +
                'Firebase Authentication Error: Invalid API Key\n' +
                '----------------------------------------------------------------\n' +
                'The API key provided in your configuration is invalid.\n\n' +
                'Please perform the following checks:\n' +
                '1. Open your `.env.local` file.\n' +
                '2. Find the line `NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_VALUE`.\n' +
                '3. Go to your Firebase project settings -> General -> Your apps -> SDK setup and configuration.\n' +
                '4. Carefully compare the `apiKey` value from Firebase with the value in your `.env.local` file.\n' +
                '5. Ensure there are no typos, extra spaces, or missing characters.\n' +
                '6. After verifying, you MUST restart your Next.js development server for the changes to take effect.\n' +
                '----------------------------------------------------------------'
            );
        }
        // Re-throw any other errors
        throw error;
    }
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
