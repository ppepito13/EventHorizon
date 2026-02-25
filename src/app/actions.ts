
'use server';

import type { Event } from '@/lib/types';
import { sendConfirmationEmail } from '@/lib/email';
import { adminDb } from '@/lib/firebase-admin';

// This action is now only responsible for sending an email.
// The database operations have been moved to the client-side form
// to avoid Admin SDK authentication issues in the serverless environment for public actions.
export async function registerForEvent(
  event: Pick<Event, 'name' | 'date'>,
  registrationData: { email: string, fullName: string },
  qrCodeDataUrl: string
): Promise<{
  success: boolean;
  emailStatus?: 'sent' | 'failed' | 'skipped';
  emailError?: string;
}> {
  
  try {
    const recipientEmail = registrationData.email;
    const recipientName = registrationData.fullName || 'Uczestniku';
    
    let emailStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
    let emailError: string | undefined = undefined;

    if (recipientEmail) {
        const emailResult = await sendConfirmationEmail({
            to: recipientEmail,
            name: recipientName,
            eventName: event.name,
            eventDate: event.date,
            qrCodeDataUrl: qrCodeDataUrl,
        });

        if (emailResult.success) {
            emailStatus = 'sent';
        } else {
            emailStatus = 'failed';
            emailError = emailResult.error;
        }
    } else {
         console.warn("No email address found in registration data, skipping email confirmation.");
         emailStatus = 'skipped';
    }

    return { success: true, emailStatus, emailError };

  } catch (error) {
    console.error('Email sending failed:', error);
    const message = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return {
      success: false,
      emailStatus: 'failed',
      emailError: message
    };
  }
}
