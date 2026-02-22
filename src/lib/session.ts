import { getIronSession, IronSessionData } from 'iron-session';
import { cookies } from 'next/headers';
import type { User } from './types';

// Define the shape of the data stored in the session.
export interface SessionData extends IronSessionData {
  user?: Omit<User, 'password'>; // Store user data, but omit password
}

export const sessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD as string,
  cookieName: 'event-platform-auth-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

// This is the key function to get the session in Server Components and Actions.
export async function getSession() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  return session;
}

// A helper to get the current user from the session.
export async function getSessionUser(): Promise<Omit<User, 'password'> | null> {
    const session = await getSession();
    return session.user ?? null;
}
