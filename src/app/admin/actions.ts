
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Event, User } from '@/lib/types';
import { getUserByEmail } from '@/lib/data';

export async function getAppUserByEmailAction(email: string): Promise<User | null> {
    if (!email) return null;
    const user = await getUserByEmail(email);
    return user;
}
