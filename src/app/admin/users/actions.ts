
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createUser, deleteUser, updateUser, getUserById } from '@/lib/data';
import type { User } from '@/lib/types';
import { adminAuth } from '@/lib/firebase-admin';

const userSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().optional(),
  role: z.enum(['Administrator', 'Organizer']),
  assignedEvents: z.array(z.string()).default([]),
  changePassword: z.preprocess(v => v === 'on', z.boolean()).optional(),
});

export async function createUserAction(prevState: any, formData: FormData) {
  const assignedEvents = formData.getAll('assignedEvents');
  const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role'),
      assignedEvents: assignedEvents
  };

  const validated = userSchema.safeParse(data);

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    };
  }
  
  if (!validated.data.password || validated.data.password.length < 6) {
     return {
      success: false,
      errors: { password: ['Password must be at least 6 characters.'] },
    };
  }

  const { password, ...userData } = validated.data;
  
  try {
    // 1. Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
        email: userData.email,
        password: password!,
        displayName: userData.name,
        disabled: false,
    });

    // 2. Save user metadata to our database (users.json)
    const newUser: Omit<User, 'id'> = {
        ...userData,
        uid: userRecord.uid,
    };
    await createUser(newUser);

  } catch (error: any) {
    console.error("Firebase user creation error:", error);
    if (error.code === 'auth/email-already-exists') {
      return {
        success: false,
        errors: { email: ['This email address is already in use.'] },
      };
    }
    return {
      success: false,
      errors: { _form: [error.message || 'An unknown error occurred while creating the user.'] },
    }
  }


  revalidatePath('/admin/users');
  return { success: true, errors: {} };
}


export async function updateUserAction(id: string, prevState: any, formData: FormData) {
  const assignedEvents = formData.getAll('assignedEvents');
  const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role'),
      assignedEvents: assignedEvents,
      changePassword: formData.get('changePassword'),
  };
  
  const validated = userSchema.safeParse(data);

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    };
  }
  
  const { password, changePassword, ...userData } = validated.data;
  
  if (changePassword && (!password || password.length < 6)) {
    return {
        success: false,
        errors: { password: ['New password must be at least 6 characters.'] },
    };
  }

  try {
    const userToUpdate = await getUserById(id);
    if (!userToUpdate || !userToUpdate.uid) {
        throw new Error('User not found or is missing a Firebase UID.');
    }
    
    // 1. Update user in Firebase Auth
    const updatePayload: { email?: string; password?: string, displayName?: string } = {
        email: userData.email,
        displayName: userData.name,
    };
    if (changePassword && password) {
        updatePayload.password = password;
    }
    await adminAuth.updateUser(userToUpdate.uid, updatePayload);

    // 2. Update user in our database (users.json)
    await updateUser(id, userData);

  } catch (error: any) {
     console.error("Firebase user update error:", error);
     return {
      success: false,
      errors: { _form: [error.message || 'An unknown error occurred while updating the user.'] },
    }
  }


  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${id}/edit`);

  return { success: true, errors: {} };
}

export async function deleteUserAction(id: string) {
  try {
    const userToDelete = await getUserById(id);
    if (!userToDelete) {
        throw new Error('User not found in JSON file.');
    }

    // 1. Delete from Firebase Auth, if UID exists
    if (userToDelete.uid) {
        await adminAuth.deleteUser(userToDelete.uid);
    }

    // 2. Delete from our database (users.json)
    await deleteUser(id);

    revalidatePath('/admin/users');
    return { success: true, message: 'User deleted successfully.' };
  } catch (error) {
    console.error("Delete user error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred.',
    };
  }
}
