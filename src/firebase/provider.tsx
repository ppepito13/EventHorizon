
/**
 * @fileOverview Core Firebase React Provider.
 * This file implements the Context API wrapper for Firebase Services (App, Auth, Firestore)
 * and manages the global user authentication state.
 *
 * Decisions:
 * - We use onIdTokenChanged instead of onAuthStateChanged to ensure we always have
 *   an up-to-date token for security rules and backend handshakes.
 * - The state is kept at the top level to prevent hydration mismatches in the App Router.
 */

'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, Query, CollectionReference } from 'firebase/firestore';
import { Auth, User, onIdTokenChanged } from 'firebase/auth';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

/** Internal state for managing the Firebase User lifecycle. */
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/** Combined context value containing both service instances and auth state. */
export interface FirebaseContextState {
  areServicesAvailable: boolean; // Indicates if the core services are initialized and ready.
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; 
  user: User | null;
  isUserLoading: boolean; // True while the initial Firebase handshake is in progress.
  userError: Error | null; // Captures critical auth-related failures.
}

/** Return structure for the useFirebase() multi-purpose hook. */
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/** Simplified result for hooks focusing exclusively on user state. */
export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * Root Provider for Firebase services.
 * Must wrap the application in the main layout.
 * 
 * @param {FirebaseProviderProps} props - Initialized service instances.
 * @returns {JSX.Element}
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, 
    userError: null,
  });

  useEffect(() => {
    if (!auth) { 
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null }); 

    // Subscribe to auth state changes.
    // onIdTokenChanged is preferred for applications that might perform server-side verification.
    const unsubscribe = onIdTokenChanged(
      auth,
      (firebaseUser) => {
        // Synchronize React state with the native Firebase listener.
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => {
        console.error("FirebaseProvider: Auth state change error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe(); 
  }, [auth]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Global hook to access all Firebase primitives and user state.
 * @throws {Error} If called outside of FirebaseProvider.
 * @returns {FirebaseServicesAndUser}
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Specialized hook for the Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Specialized hook for the Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Specialized hook for the Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase<T> = T & {__memo?: boolean};

/**
 * Utility hook to stabilize Firebase Query/Reference objects between renders.
 * Prevents infinite loops in real-time listeners.
 * 
 * @template T
 * @param {() => T | null} factory - Function returning the Firebase resource.
 * @param {DependencyList} deps - Dependency array for memoization.
 * @returns {T | null}
 */
export function useMemoFirebase<T>(factory: () => T | null, deps: DependencyList): (T | null) {
  const memoized = useMemo(factory, deps);
  
  if (memoized === null || typeof memoized !== 'object') {
    return memoized;
  }
  
  // Tag the object to indicate it's memoized, used for validation in useCollection/useDoc.
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Focused hook for accessing the authenticated user and their loading status.
 * @returns {UserHookResult}
 */
export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};


export * from './firestore/use-collection';
export * from './firestore/use-doc';
