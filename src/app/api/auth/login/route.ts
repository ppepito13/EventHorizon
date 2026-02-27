
'use server';

/**
 * @fileOverview Secure Authentication Handshake.
 * This API route receives a Firebase ID Token from the client, verifies it using 
 * the Admin SDK, and establishes a secure server-side session.
 * 
 * Linkage Logic:
 * We use the 'email' field as the unique identifier to link Firebase Auth accounts 
 * with our application-specific profile data (roles, assigned events).
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session';
import { getUserByEmail } from '@/lib/data';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'ID token is required.' }, { status: 400 });
    }

    // verification of the token ensures the request actually came from an authenticated user.
    const decodedToken = await adminAuth.verifyIdToken(token);
    const { email, uid } = decodedToken;
    
    if (!email) {
        return NextResponse.json({ error: 'No email found in token.' }, { status: 400 });
    }

    // Check if the authenticated email exists in our permission database.
    const appUser = await getUserByEmail(email);
    if (!appUser) {
        console.warn(`Auth attempt by ${email} - not found in application DB.`);
        return NextResponse.json({ error: 'User not found in application database.' }, { status: 404 });
    }
    
    const session = await getSession();
    
    // Security Rule: Do not store any sensitive fields or passwords in the client-readable session.
    const { password, ...userToStore } = appUser as any;
    session.user = { ...userToStore, uid };
    await session.save();

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('/api/auth/login handshake error:', error);
    return NextResponse.json({ error: error.message || 'Authentication failed.' }, { status: 500 });
  }
}
