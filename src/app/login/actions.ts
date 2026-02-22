'use server';

import { getUserByEmail } from '@/lib/data';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { redirect } from 'next/navigation';

async function createSession(userId: string) {
  const sessionFilePath = path.join(process.cwd(), '.tmp', 'session.json');
  const sessionData = { userId };
  await fs.mkdir(path.dirname(sessionFilePath), { recursive: true });
  await fs.writeFile(sessionFilePath, JSON.stringify(sessionData, null, 2), 'utf8');
}

const FormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password cannot be empty.' }),
});

export async function loginAction(prevState: { error: string } | undefined, formData: FormData) {
  const validatedFields = FormSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    return {
      error: fieldErrors.email?.[0] || fieldErrors.password?.[0] || 'Invalid input.',
    };
  }

  const { email, password } = validatedFields.data;

  try {
    const user = await getUserByEmail(email);
    if (!user || user.password !== password) {
      return { error: 'Invalid credentials. Please try again.' };
    }
    
    await createSession(user.id);

  } catch (error) {
    console.error(error);
    return { error: 'An unexpected server error occurred.' };
  }
  
  redirect('/admin');
}
