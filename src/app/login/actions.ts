'use server';

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getUserByEmail } from '@/lib/data';

export async function loginAction(
  prevState: { error?: string } | undefined,
  formData: FormData
) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const user = await getUserByEmail(email);

    if (!user || user.password !== password) {
      return { error: 'Invalid email or password.' };
    }

    const session = await getSession();
    // Exclude password from the session object for security
    const { password: _, ...userToStore } = user;
    session.user = {
        ...userToStore,
        // Ensure uid is passed to the session if it exists on the user object
        uid: user.uid
    };
    await session.save();

  } catch (error) {
    console.error('Login Action Error:', error);
    if (error instanceof Error) {
        return { error: error.message };
    }
    return { error: 'An unexpected server error occurred.' };
  }

  redirect('/admin');
}
