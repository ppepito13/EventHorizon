
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createUser, deleteUser, updateUser, getUsers, overwriteUsers } from '@/lib/data';
import type { User, Event } from '@/lib/types';
import { randomUUID } from 'crypto';

const userSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  email: z.string().email('Invalid email address.'),
  role: z.enum(['Administrator', 'Organizer']),
  assignedEvents: z.array(z.string()).default([]),
});

export async function createUserAction(prevState: any, formData: FormData) {
  const assignedEvents = formData.getAll('assignedEvents');
  const data = {
      name: formData.get('name'),
      email: formData.get('email'),
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

  try {
    const newUser = await createUser(validated.data);
    
    revalidatePath('/admin/users');
    return { 
        success: true, 
        message: `User ${newUser.name} created. To enable login, please go to the Firebase Console -> Authentication -> Add user, and create an account with the email ${newUser.email} and a password.`, 
        errors: {} 
    };

  } catch (error: any) {
    console.error("User creation error:", error);
    return {
      success: false,
      errors: { _form: [error.message || 'An unknown error occurred while creating the user.'] },
    }
  }
}

export async function updateUserAction(id: string, prevState: any, formData: FormData) {
  const assignedEvents = formData.getAll('assignedEvents');
  const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      role: formData.get('role'),
      assignedEvents: assignedEvents,
  };
  
  // This schema is simplified as we are not handling password changes here.
  const updateSchema = userSchema.omit({ password: true } as any);
  const validated = updateSchema.safeParse(data);

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    };
  }
  
  try {
    await updateUser(id, validated.data);

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${id}/edit`);

    return { success: true, message: 'User updated successfully. If you changed the email, please update it in Firebase Authentication manually.', errors: {} };

  } catch (error: any) {
     console.error("User update error:", error);
     return {
      success: false,
      errors: { _form: [error.message || 'An unknown error occurred while updating the user.'] },
    }
  }
}

export async function deleteUserAction(id: string) {
  try {
    const userToDelete = await getUsers().then(users => users.find(u => u.id === id));
    if (!userToDelete) {
        throw new Error('User not found in JSON file.');
    }

    if (userToDelete.role === 'Administrator') {
      return { success: false, message: 'Cannot delete an administrator account.' };
    }

    await deleteUser(id);

    revalidatePath('/admin/users');
    return { success: true, message: `User ${userToDelete.name} was removed from the app. Please remove their login credentials from the Firebase Console manually.` };
  } catch (error) {
    console.error("Delete user error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred.',
    };
  }
}

export async function generateUsersAction(count: number, allEvents: Event[]) {
  if (count <= 0 || count > 50) {
    return { success: false, message: 'Please provide a number between 1 and 50.' };
  }
  if (!allEvents || allEvents.length === 0) {
    return { success: false, message: 'Cannot generate users because no events exist. Please create an event first.' };
  }
  
  try {
    const existingUsers = await getUsers();
    const firstNames = ['Leia', 'Luke', 'Han', 'Anakin', 'Padme', 'Obi-Wan', 'Yoda'];
    const lastNames = ['Organa', 'Skywalker', 'Solo', 'Vader', 'Amidala', 'Kenobi', 'Jedi'];

    let newUsersForJson: User[] = [];
    let instructions = [];
    for (let i = 0; i < count; i++) {
        const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        let name = `${randomFirstName} ${randomLastName}`;
        
        let nameCounter = 1;
        while(existingUsers.some(u => u.name === name) || newUsersForJson.some(u => u.name === name)) {
            name = `${randomFirstName} ${randomLastName} ${nameCounter++}`;
        }

        const email = `${name.toLowerCase().replace(/ /g, '.')}@example.com`;
        
        const assignedEvents = allEvents
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 3))
          .map(e => e.name);

        newUsersForJson.push({
            id: `usr_${randomUUID()}`,
            name,
            email,
            role: 'Organizer',
            assignedEvents,
        });
        instructions.push(`- ${email}`);
    }

    await overwriteUsers([...existingUsers, ...newUsersForJson]);

    revalidatePath('/admin/users');
    return { success: true, message: `${count} users generated. To enable login, create accounts in Firebase Auth for the following emails (password: 'password'): ${instructions.join(' ')}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error("Generate users error:", error);
    return { success: false, message };
  }
}

export async function purgeUsersAction() {
    try {
        const allUsers = await getUsers();
        const usersToDelete = allUsers.filter(user => user.role !== 'Administrator');
        const adminUsers = allUsers.filter(user => user.role === 'Administrator');

        if (usersToDelete.length === 0) {
            return { success: true, message: 'No non-admin users to purge.' };
        }
        
        await overwriteUsers(adminUsers);

        revalidatePath('/admin/users');
        return { success: true, message: `${usersToDelete.length} users have been purged from the app. Please remove their login credentials from Firebase Authentication manually.` };

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error("Purge users error:", error);
        return { success: false, message };
  }
}
