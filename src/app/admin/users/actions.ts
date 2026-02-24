
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createUser, deleteUser, updateUser, getUsers, overwriteUsers } from '@/lib/data';
import type { User, Event } from '@/lib/types';
import { adminAuth } from '@/lib/firebase-admin';
import type { UpdateRequest } from 'firebase-admin/auth';

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
    const userRecord = await adminAuth.createUser({
        email: userData.email,
        password: password!,
        displayName: userData.name,
        emailVerified: true,
        disabled: false,
    });

    const newUser = await createUser({ ...userData, uid: userRecord.uid });
    
    revalidatePath('/admin/users');
    return { 
        success: true, 
        message: `User ${newUser.name} created successfully. They can now log in.`, 
        errors: {} 
    };

  } catch (error: any) {
    console.error("User creation error:", error);
    let errorMessage = 'An unknown error occurred while creating the user.';
    if (error.code === 'auth/email-already-exists') {
        errorMessage = 'A user with this email address already exists in Firebase Authentication.';
    } else if (error.message) {
        errorMessage = error.message;
    }
    return {
      success: false,
      errors: { _form: [errorMessage] },
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
    const userToUpdate = await getUsers().then(users => users.find(u => u.id === id));
    if (!userToUpdate) {
        throw new Error('User not found in the database.');
    }
    
    const uid = userToUpdate.uid;
    if (uid) {
        const authUpdatePayload: UpdateRequest = {};
        if (userData.email !== userToUpdate.email) authUpdatePayload.email = userData.email;
        if (userData.name !== userToUpdate.name) authUpdatePayload.displayName = userData.name;
        if (changePassword && password) authUpdatePayload.password = password;

        if (Object.keys(authUpdatePayload).length > 0) {
            await adminAuth.updateUser(uid, authUpdatePayload);
        }
    }
    
    await updateUser(id, userData);

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${id}/edit`);

    return { success: true, message: 'User updated successfully.', errors: {} };

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
    
    if (userToDelete.uid) {
        try {
            await adminAuth.deleteUser(userToDelete.uid);
        } catch (error: any) {
             if (error.code !== 'auth/user-not-found') {
                throw error; // Re-throw if it's not a "not found" error
             }
             // If user not found in auth, we can ignore and proceed to delete from JSON
        }
    }

    await deleteUser(id);

    revalidatePath('/admin/users');
    return { success: true, message: `User ${userToDelete.name} was successfully removed from the app and Firebase Authentication.` };
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

        const userRecord = await adminAuth.createUser({
            email,
            password: 'password',
            displayName: name,
            emailVerified: true,
        });

        newUsersForJson.push({
            id: `usr_${randomUUID()}`,
            uid: userRecord.uid,
            name,
            email,
            role: 'Organizer',
            assignedEvents,
        });
    }

    await overwriteUsers([...existingUsers, ...newUsersForJson]);

    revalidatePath('/admin/users');
    return { success: true, message: `${count} users generated successfully in the app and Firebase Authentication.` };
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
        
        const uidsToDelete = usersToDelete.map(u => u.uid).filter((uid): uid is string => !!uid);
        
        if (uidsToDelete.length > 0) {
            await adminAuth.deleteUsers(uidsToDelete);
        }
        
        await overwriteUsers(adminUsers);

        revalidatePath('/admin/users');
        return { success: true, message: `${usersToDelete.length} users have been purged from the app and Firebase Authentication.` };

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error("Purge users error:", error);
        return { success: false, message };
    }
}
