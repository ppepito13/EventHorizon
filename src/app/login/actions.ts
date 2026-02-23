'use server';

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getUserByEmail } from '@/lib/data';

export async function login(
    prevState: { error: string } | undefined,
    formData: FormData
) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return { error: 'Email and password are required.' };
    }

    const user = await getUserByEmail(email);

    if (!user || user.password !== password) {
      return { error: 'Invalid email or password.' };
    }

    // Get the session
    const session = await getSession();

    // Save user data to session, omitting password
    const { password: _, ...userToStore } = user;
    session.user = userToStore;
    await session.save();

  } catch (error) {
    console.error(error);
    return { error: 'A server error occurred. Please try again.' };
  }

  // Redirect to admin panel on successful login
  redirect('/admin');
}
