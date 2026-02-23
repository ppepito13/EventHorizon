
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
    const app = initializeClientApp();
    return {
      firebaseApp: app,
      auth: getAuth(app),
      firestore: getFirestore(app),
    };
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
