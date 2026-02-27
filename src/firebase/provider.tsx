/**
 * @fileOverview Core Firebase React Provider.
 * This file implements the Context API wrapper for Firebase Services (App, Auth, Firestore)
 * and manages the global user authentication state.
 *
 * MIGRATION NOTE: We use 'onIdTokenChanged' instead of the more common 'onAuthStateChanged'.
 * WHY? In an SSR/Hybrid environment (Next.js), we need to ensure that token refreshes
 * are captured so that downstream Server Actions or API calls always have a valid 
 * token if they rely on Authorization headers or custom cookies.
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
  areServicesAvailable: boolean; 
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; 
  user: User | null;
  isUserLoading: boolean; 
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * Root Provider for Firebase services.
 * Ensures that the SDK instances are shared across the entire React tree.
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
    if (!auth) return;

    setUserAuthState(prev => ({ ...prev, isUserLoading: true })); 

    /**
     * Subscribe to token/auth state changes.
     * This listener handles login, logout, and token refreshes.
     */
    const unsubscribe = onIdTokenChanged(
      auth,
      (firebaseUser) => {
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => {
        console.error("FirebaseProvider Auth Error:", error);
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
 * Multi-purpose hook to access Firebase services.
 * 
 * TODO: In production, you might want to split this into useAuth() and useFirestore() 
 * to reduce re-renders in components that only need one service.
 */
export const useFirebase = (): {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
} => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available.');
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

export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;

type MemoFirebase<T> = T & {__memo?: boolean};

/**
 * Crucial utility for Stabilizing Firestore Queries.
 * 
 * Without this, creating a query like `query(collection(...))` inside a component
 * will cause an infinite loop in the `useCollection` hook because the Query object 
 * is a new instance on every render.
 */
export function useMemoFirebase<T>(factory: () => T | null, deps: DependencyList): (T | null) {
  const memoized = useMemo(factory, deps);
  if (memoized === null || typeof memoized !== 'object') return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  return memoized;
}

export const useUser = () => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};

export * from './firestore/use-collection';
export * from './firestore/use-doc';
