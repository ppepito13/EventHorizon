'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createUser, deleteUser, updateUser } from '@/lib/data';
import type { User } from '@/lib/types';

const userSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').optional().or(z.literal('')),
  role: z.enum(['Administrator', 'Organizer']),
  assignedEvents: z.array(z.string()).default([]),
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
  
  if (!validated.data.password) {
     return {
      success: false,
      errors: { password: ['Password is required for a new user.'] },
    };
  }

  const { password, ...userData } = validated.data;
  
  const newUser: Omit<User, 'id'> = {
      ...userData,
      password: password, // Pass password to be saved
  };

  await createUser(newUser);

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
      assignedEvents: assignedEvents
  };
  
  const validated = userSchema.safeParse(data);

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    };
  }
  
  const { password, ...userData } = validated.data;

  const updateData: Partial<Omit<User, 'id'>> & { password?: string } = {
      ...userData
  };

  if (password) {
    updateData.password = password;
  }

  await updateUser(id, updateData);

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${id}/edit`);

  return { success: true, errors: {} };
}

export async function deleteUserAction(id: string) {
  try {
    await deleteUser(id);
    revalidatePath('/admin/users');
    return { success: true, message: 'User deleted successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred.',
    };
  }
}
