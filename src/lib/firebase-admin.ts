import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// Initialize Firebase Admin SDK only once
if (!getApps().length) {
  admin.initializeApp();
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
