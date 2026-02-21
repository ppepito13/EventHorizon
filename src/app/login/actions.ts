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

// Use a directory not watched by the dev server to prevent restarts on file change.
const sessionFilePath = path.join(process.cwd(), '.tmp', 'session.json');

export async function login(prevState: { error: string } | undefined, formData: FormData) {
  const validatedFields = loginSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      error: "Invalid email or password.",
    };
  }

  const { email, password } = validatedFields.data;

  try {
    const user = await getUserByEmail(email);

    if (!user || user.password !== password) {
      return { error: 'Invalid email or password.' };
    }

    // Set session by writing to file
    const sessionData = { userId: user.id };
    await fs.mkdir(path.dirname(sessionFilePath), { recursive: true });
    await fs.writeFile(sessionFilePath, JSON.stringify(sessionData, null, 2), 'utf8');

  } catch (error) {
    console.error(error);
    return { error: 'A server error occurred. Please try again.' };
  }
  
  redirect('/admin');
}
