'use server';

import { adminAuth } from '@/lib/firebase-admin';
import { getUsers } from '@/lib/data';

export async function seedAuthUsersAction() {
  try {
    const users = await getUsers();
    if (!users || users.length === 0) {
      return { success: false, message: 'No demo users found in data file.' };
    }

    let createdCount = 0;
    let existingCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      if (!user.email || !user.password) continue;

      try {
        // Check if user exists
        await adminAuth.getUserByEmail(user.email);
        existingCount++;
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // User does not exist, so create them
          try {
            await adminAuth.createUser({
              email: user.email,
              password: user.password,
              displayName: user.name,
              disabled: false,
            });
            createdCount++;
          } catch (createError: any) {
            errors.push(`Failed to create ${user.email}: ${createError.message}`);
          }
        } else {
          // Some other error occurred
          errors.push(`Error checking ${user.email}: ${error.message}`);
        }
      }
    }
    
    const message = `Seeding complete. Created: ${createdCount}, Already existed: ${existingCount}.`;
    if (errors.length > 0) {
      return { success: false, message: `${message} Errors: ${errors.join(', ')}` };
    }

    return { success: true, message };

  } catch (error: any) {
    console.error("Seed Auth Users Action Error:", error);
    return { success: false, message: error.message || 'An unknown error occurred during seeding.' };
  }
}
