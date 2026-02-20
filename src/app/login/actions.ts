'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { getUserByEmail } from '@/lib/data';
import { promises as fs } from 'fs';
import path from 'path';

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const sessionFilePath = path.join(process.cwd(), 'src', 'data', 'session.json');

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

    // Set session by writing to file
    const sessionData = { userId: user.id };
    await fs.writeFile(sessionFilePath, JSON.stringify(sessionData, null, 2), 'utf8');

  } catch (error) {
    console.error(error);
    return { error: 'Wystąpił błąd serwera. Spróbuj ponownie.' };
  }
  
  redirect('/admin');
}
