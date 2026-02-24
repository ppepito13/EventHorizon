
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createUser, deleteUser, updateUser, getUserById, getUsers, overwriteUsers, getEvents } from '@/lib/data';
import type { User, Event } from '@/lib/types';
import { adminAuth } from '@/lib/firebase-admin';

const userSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().nullable().optional(),
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
    const newUser = await createUser(userData);
    revalidatePath('/admin/users');
    return { 
        success: true, 
        message: `User ${newUser.name} created. To enable login, go to the Firebase Authentication console and add a user with the email ${newUser.email}.`, 
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
    const user = await getUserById(id);
    let uid = user?.uid;
    if (!uid && userData.email) {
        try {
            const firebaseUser = await adminAuth.getUserByEmail(userData.email);
            uid = firebaseUser.uid;
        } catch (e) {
            // User might not exist in auth yet, that's ok. We can proceed without the uid.
        }
    }
    await updateUser(id, { ...userData, uid });

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${id}/edit`);

    let message = 'User updated successfully.';
    if (changePassword) {
        message += ' Please update the password manually in the Firebase Authentication console.';
    }

    return { success: true, message: message, errors: {} };

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
    const userToDelete = await getUserById(id);
    if (!userToDelete) {
        throw new Error('User not found in JSON file.');
    }

    if (userToDelete.role === 'Administrator') {
      return { success: false, message: 'Cannot delete an administrator account.' };
    }

    await deleteUser(id);

    revalidatePath('/admin/users');
    return { success: true, message: `User ${userToDelete.name} removed. Remember to also delete them from the Firebase Authentication console.` };
  } catch (error) {
    console.error("Delete user error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred.',
    };
  }
}


export async function generateUsersAction(count: number) {
  if (count <= 0 || count > 50) {
    return { success: false, message: 'Please provide a number between 1 and 50.' };
  }
  try {
    const existingUsers = await getUsers();
    const allEvents = await getEvents();

    if (allEvents.length === 0) {
        return { success: false, message: 'Cannot generate users because no events exist. Please create an event first.' };
    }

    const firstNames = ['Leia', 'Luke', 'Han', 'Anakin', 'Padme', 'Obi-Wan', 'Yoda'];
    const lastNames = ['Organa', 'Skywalker', 'Solo', 'Vader', 'Amidala', 'Kenobi', 'Jedi'];

    let createdEmails = [];
    for (let i = 0; i < count; i++) {
        const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        let name = `${randomFirstName} ${randomLastName}`;
        
        let nameCounter = 1;
        while(existingUsers.some(u => u.name === name)) {
            name = `${randomFirstName} ${randomLastName} ${nameCounter++}`;
        }

        const email = `${name.toLowerCase().replace(/ /g, '.')}@example.com`;
        
        const assignedEvents = allEvents
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 3))
          .map(e => e.name);

        const newUser: Omit<User, 'id'> = {
            name,
            email,
            role: 'Organizer',
            assignedEvents,
        };
        await createUser(newUser);
        existingUsers.push({ ...newUser, id: 'temp-id-for-uniqueness-check' });
        createdEmails.push(email);
    }
    revalidatePath('/admin/users');
    const instruction = count === 1 
      ? `To enable login, add a user in Firebase Auth with the email: ${createdEmails[0]}`
      : `To enable logins, create users in Firebase Auth with the following emails: ${createdEmails.join(', ')}`;
      
    return { success: true, message: `${count} users generated in the app. ${instruction}.` };
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
        return { success: true, message: `${usersToDelete.length} users have been purged from the app. Remember to also delete them from the Firebase Authentication console.` };

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error("Purge users error:", error);
        return { success: false, message };
    }
}
