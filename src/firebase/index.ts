'use client';

// We are intentionally not exporting the providers or context hooks from this barrel file
// to avoid potential module resolution issues that can lead to context mismatches.
//
// Instead, import providers and hooks directly from their source files:
// import { FirebaseClientProvider } from '@/firebase/client-provider';
// import { useAuth, useFirestore } from '@/firebase/provider';

export * from './firestore/use-collection';
export * from './firestore/use-doc';
