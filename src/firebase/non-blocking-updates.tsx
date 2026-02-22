'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { Auth } from 'firebase/auth';

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(auth: Auth, docRef: DocumentReference, data: any, options: SetOptions) {
  setDoc(docRef, data, options).catch(error => {
    console.error(`Error in setDocumentNonBlocking for path ${docRef.path}:`, error);
  })
  // Execution continues immediately
}


/**
 * Initiates an addDoc operation for a collection reference.
 * Does NOT await the write operation internally.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(auth: Auth, colRef: CollectionReference, data: any) {
  const promise = addDoc(colRef, data)
    .catch(error => {
      console.error(`Error in addDocumentNonBlocking for path ${colRef.path}:`, error);
    });
  return promise;
}


/**
 * Initiates an updateDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(auth: Auth, docRef: DocumentReference, data: any) {
  updateDoc(docRef, data)
    .catch(error => {
      console.error(`Error in updateDocumentNonBlocking for path ${docRef.path}:`, error);
    });
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(auth: Auth, docRef: DocumentReference) {
  deleteDoc(docRef)
    .catch(error => {
      console.error(`Error in deleteDocumentNonBlocking for path ${docRef.path}:`, error);
    });
}
