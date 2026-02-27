'use server';

import type { Event } from '@/lib/types';
import { sendConfirmationEmail, sendPendingEmail, sendApprovedEmail, sendRejectedEmail } from '@/lib/email';

export async function registerForEvent(
  event: Pick<Event, 'name' | 'date'>,
  registrationData: { email: string, fullName: string },
  qrCodeDataUrl: string | undefined,
  requiresApproval: boolean
): Promise<{
  success: boolean;
  emailStatus?: 'sent' | 'failed' | 'skipped';
  emailError?: string;
}> {
  
  try {
    const recipientEmail = registrationData.email;
    const recipientName = registrationData.fullName || 'Participant';
    
    let emailStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
    let emailError: string | undefined = undefined;

    if (recipientEmail) {
        let emailResult;
        
        if (requiresApproval) {
            // For events requiring approval, we only send "pending" info
            emailResult = await sendPendingEmail({
                to: recipientEmail,
                name: recipientName,
                eventName: event.name,
                eventDate: event.date
            });
        } else {
            // For open events, send confirmation immediately (with or without QR)
            emailResult = await sendConfirmationEmail({
                to: recipientEmail,
                name: recipientName,
                eventName: event.name,
                eventDate: event.date,
                qrCodeDataUrl: qrCodeDataUrl,
            });
        }

        if (emailResult.success) {
            emailStatus = 'sent';
        } else {
            emailStatus = 'failed';
            emailError = emailResult.error;
        }
    } else {
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

/**
 * Action called when an admin manually changes the approval status.
 */
export async function notifyRegistrationStatusChange(
    event: Pick<Event, 'name' | 'date'>,
    userData: { email: string, name: string },
    newStatus: boolean,
    qrCodeDataUrl?: string
) {
    try {
        let result;
        if (newStatus === true) {
            // Approved -> send email (with or without QR code)
            result = await sendApprovedEmail({
                to: userData.email,
                name: userData.name,
                eventName: event.name,
                eventDate: event.date,
                qrCodeDataUrl
            });
        } else {
            // Rejected/Revoked -> send rejection information
            result = await sendRejectedEmail({
                to: userData.email,
                name: userData.name,
                eventName: event.name,
                eventDate: event.date
            });
        }
        return result;
    } catch (error) {
        console.error("Status notification failed:", error);
        return { success: false, error: 'Failed to send notification email.' };
    }
}
