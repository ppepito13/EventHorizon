'use server';

import { z } from 'zod';
import { getUserById, updateUser } from '@/lib/data';
import { revalidatePath } from 'next/cache';

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(6, "New password must be at least 6 characters."),
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
});


export async function changePasswordAction(
  userId: string,
  prevState: { error?: string; success?: boolean },
  formData: FormData
) {
  const validatedFields = passwordSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors)[0]?.[0];
    return {
      error: firstError || "Invalid data.",
    };
  }

  const { currentPassword, newPassword } = validatedFields.data;

  try {
    const user = await getUserById(userId);

    if (!user) {
      return { error: 'User not found.' };
    }
    
    if (user.password !== currentPassword) {
      return { error: 'Current password is incorrect.' };
    }

    await updateUser(userId, { password: newPassword });

    revalidatePath('/admin/account');
    return { success: true };

  } catch (error) {
    console.error(error);
    return { error: 'A server error occurred. Please try again.' };
  }
}
