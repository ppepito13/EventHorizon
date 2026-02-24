
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createUser, deleteUser, updateUser, getUserById, getUsers, overwriteUsers } from '@/lib/data';
import type { User, Event } from '@/lib/types';
// import { adminAuth } from '@/lib/firebase-admin';

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
    // 1. Create user in Firebase Auth - TEMPORARILY DISABLED due to server environment auth issues.
    // const userRecord = await adminAuth.createUser({
    //     email: userData.email,
    //     password: password!,
    //     displayName: userData.name,
    //     disabled: false,
    // });

    // 2. Save user metadata to our database (users.json)
    const newUser: Omit<User, 'id'> = {
        ...userData,
        // uid: userRecord.uid, // No UID available
    };
    await createUser(newUser);

  } catch (error: any) {
    console.error("User creation error:", error);
    // if (error.code === 'auth/email-already-exists') { // This check requires the adminAuth call
    //   return {
    //     success: false,
    //     errors: { email: ['This email address is already in use.'] },
    //   };
    // }
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
    // 1. Update user in Firebase Auth -- TEMPORARILY DISABLED
    // const userToUpdate = await getUserById(id);
    // if (!userToUpdate) {
    //     throw new Error('User not found in user data file.');
    // }
    // let authUid = userToUpdate.uid;
    // ... logic to find and update user in Firebase Auth

    // 2. Update user in our database (users.json)
    await updateUser(id, userData);

  } catch (error: any) {
     console.error("User update error:", error);
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

    // 1. Delete from Firebase Auth, if UID exists -- TEMPORARILY DISABLED
    // if (userToDelete.uid) {
    //     await adminAuth.deleteUser(userToDelete.uid);
    // }

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


export async function generateUsersAction(count: number) {
  if (count <= 0 || count > 50) {
    return { success: false, message: 'Please provide a number between 1 and 50.' };
  }
  try {
    const existingUsers = await getUsers();
    const allEvents = await import('@/data/events.json').then(m => m.default) as Event[];

    const firstNames = ['Leia', 'Luke', 'Han', 'Anakin', 'Padme', 'Obi-Wan', 'Yoda'];
    const lastNames = ['Organa', 'Skywalker', 'Solo', 'Vader', 'Amidala', 'Kenobi', 'Jedi'];

    for (let i = 0; i < count; i++) {
        const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        let name = `${randomFirstName} ${randomLastName}`;
        
        let nameCounter = 1;
        while(existingUsers.some(u => u.name === name)) {
            name = `${randomFirstName} ${randomLastName} ${nameCounter++}`;
        }

        const email = `${name.toLowerCase().replace(/ /g, '.')}@example.com`;
        
        // Create user in Firebase Auth -- TEMPORARILY DISABLED
        // const userRecord = await adminAuth.createUser({
        //     email: email,
        //     password: 'password',
        //     displayName: name,
        //     disabled: false,
        // });

        const assignedEvents = allEvents
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 3))
          .map(e => e.name);

        const newUser: Omit<User, 'id'> = {
            name,
            email,
            role: 'Organizer',
            assignedEvents,
            // uid: userRecord.uid, // No UID available
        };
        await createUser(newUser);
        existingUsers.push({ ...newUser, id: 'temp-id-for-uniqueness-check' });
    }
    revalidatePath('/admin/users');
    return { success: true, message: `${count} users generated.` };
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

        // Delete from Firebase Auth -- TEMPORARILY DISABLED
        // const uidsToDelete = usersToDelete.map(u => u.uid).filter((uid): uid is string => !!uid);
        // if (uidsToDelete.length > 0) {
        //     try {
        //       await adminAuth.deleteUsers(uidsToDelete);
        //     } catch (authError: any) {
        //       console.warn("Partial or full failure during Auth user deletion, but proceeding to purge from JSON.", authError.message);
        //     }
        // }
        
        await overwriteUsers(adminUsers);

        revalidatePath('/admin/users');
        return { success: true, message: `${usersToDelete.length} users have been purged.` };

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error("Purge users error:", error);
        return { success: false, message };
    }
}
