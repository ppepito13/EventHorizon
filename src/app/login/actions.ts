'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserByEmail } from '@/lib/data';

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export async function login(prevState: { error: string } | undefined, formData: FormData) {
  const validatedFields = loginSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      error: "Nieprawidłowy email lub hasło.",
    };
  }

  const { email, password } = validatedFields.data;

  try {
    const user = await getUserByEmail(email);

    if (!user || user.password !== password) {
      return { error: 'Nieprawidłowy email lub hasło.' };
    }

    // Set session cookie
    cookies().set('session_userid', user.id, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

  } catch (error) {
    console.error(error);
    return { error: 'Wystąpił błąd serwera. Spróbuj ponownie.' };
  }
  
  redirect('/admin');
}
