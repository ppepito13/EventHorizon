'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { getUserById } from '@/lib/data';
import type { User } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

const sessionFilePath = path.join(process.cwd(), 'src', 'data', 'session.json');

type SessionData = {
  userId?: string;
};

export async function getSessionUser(): Promise<User | null> {
  noStore();
  try {
    const fileContent = await fs.readFile(sessionFilePath, 'utf8');
    const sessionData = JSON.parse(fileContent) as SessionData;
    const userId = sessionData.userId;

    if (!userId) {
      return null;
    }

    const user = await getUserById(userId);
    if (user) {
      // Don't send password to the client
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // If the session file doesn't exist, no one is logged in.
      return null;
    }
    console.error("Failed to read session file:", error);
    return null;
  }
}
