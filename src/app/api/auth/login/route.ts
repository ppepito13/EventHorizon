import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';
import { sessionOptions, type SessionData } from '@/lib/session';
import { getUserByEmail } from '@/lib/data'; // Use email to link accounts

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'ID token is required.' }, { status: 400 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const { email } = decodedToken;
    
    if (!email) {
        return NextResponse.json({ error: 'No email found in token.' }, { status: 400 });
    }

    // Use email as the link between Firebase Auth and our user data
    const appUser = await getUserByEmail(email);
    if (!appUser) {
        return NextResponse.json({ error: 'User not found in application database.' }, { status: 404 });
    }
    
    const session = await getIronSession<SessionData>(cookies(), sessionOptions);
    
    const { password, ...userToStore } = appUser;
    session.user = userToStore;
    await session.save();

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('/api/auth/login error:', error);
    return NextResponse.json({ error: error.message || 'Authentication failed.' }, { status: 500 });
  }
}
