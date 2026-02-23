'use server';

import { z } from 'zod';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserByEmail } from '@/lib/data';
import { sessionOptions, type SessionData } from '@/lib/session';

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export async function loginAction(
  prevState: { error?: string } | undefined,
  formData: FormData
) {
  const validatedFields = loginSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      error: 'Invalid email or password.',
    };
  }

  const { email, password } = validatedFields.data;

  try {
    const user = await getUserByEmail(email);

    if (!user || user.password !== password) {
      return { error: 'Invalid email or password.' };
    }

    const session = await getIronSession<SessionData>(cookies(), sessionOptions);
    // Omit password before storing in session
    const { password: _, ...userToStore } = user;
    session.user = userToStore;
    await session.save();
    
  } catch (error) {
    console.error(error);
    return { error: 'A server error occurred. Please try again.' };
  }
  
  // If we get here, login was successful.
  redirect('/admin');
}
