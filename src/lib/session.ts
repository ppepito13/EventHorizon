import { cookies } from 'next/headers';
import { getUserById } from '@/lib/data';
import type { User } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

export async function getSessionUser(): Promise<User | null> {
  noStore();
  const userId = cookies().get('session_userid')?.value;

  if (!userId) {
    return null;
  }

  try {
    const user = await getUserById(userId);
    if (user) {
      // Don't send password to the client
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch session user:", error);
    return null;
  }
}
