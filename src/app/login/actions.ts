'use server';

import { getUserByEmail } from '@/lib/data';
import { promises as fs } from 'fs';
import path from 'path';

// This is no longer the main login action.
// It's a helper to create the session file after successful Firebase client login.
export async function createSessionByEmail(email: string): Promise<{ success: boolean; error?: string }> {
  if (!email) {
    return { success: false, error: 'Email is required.' };
  }

  try {
    const user = await getUserByEmail(email);

    if (!user) {
      return { success: false, error: 'User not found in the system.' };
    }

    // Set session by writing to file
    const sessionFilePath = path.join(process.cwd(), '.tmp', 'session.json');
    const sessionData = { userId: user.id };
    await fs.mkdir(path.dirname(sessionFilePath), { recursive: true });
    await fs.writeFile(sessionFilePath, JSON.stringify(sessionData, null, 2), 'utf8');

    return { success: true };

  } catch (error) {
    console.error(error);
    return { success: false, error: 'A server error occurred while creating the session.' };
  }
}
