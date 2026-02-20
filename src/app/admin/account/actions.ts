'use server';

import { z } from 'zod';
import { getUserById, updateUser } from '@/lib/data';
import { revalidatePath } from 'next/cache';

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Aktualne hasło jest wymagane."),
    newPassword: z.string().min(6, "Nowe hasło musi mieć co najmniej 6 znaków."),
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Nowe hasła nie pasują do siebie.",
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
      error: firstError || "Nieprawidłowe dane.",
    };
  }

  const { currentPassword, newPassword } = validatedFields.data;

  try {
    const user = await getUserById(userId);

    if (!user) {
      return { error: 'Nie znaleziono użytkownika.' };
    }
    
    if (user.password !== currentPassword) {
      return { error: 'Aktualne hasło jest nieprawidłowe.' };
    }

    await updateUser(userId, { password: newPassword });

    revalidatePath('/admin/account');
    return { success: true };

  } catch (error) {
    console.error(error);
    return { error: 'Wystąpił błąd serwera. Spróbuj ponownie.' };
  }
}
