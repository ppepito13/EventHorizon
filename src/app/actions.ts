
/**
 * @fileOverview Core Server Actions for public event interactions.
 * Handles event registration logic and email notifications using the Resend service.
 *
 * TODO: Add rate limiting to prevent email spamming through the registration form.
 */

'use server';

import type { Event } from '@/lib/types';
import { sendConfirmationEmail, sendPendingEmail, sendApprovedEmail, sendRejectedEmail } from '@/lib/email';

/**
 * Handles the email notification logic immediately after a successful Firestore registration.
 *
 * @param {Pick<Event, 'name' | 'date'>} event - Minimal event data for email templates.
 * @param {{ email: string, fullName: string }} registrationData - Recipient information.
 * @param {string | undefined} qrCodeDataUrl - Data URI of the generated QR code (if applicable).
 * @param {boolean} requiresApproval - Business logic flag: if true, sends 'pending' email instead of 'confirmation'.
 * @returns {Promise<{ success: boolean, emailStatus?: string, emailError?: string }>}
 */
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
            // Business Rule: For events requiring manual verification, we only send an acknowledgment.
            emailResult = await sendPendingEmail({
                to: recipientEmail,
                name: recipientName,
                eventName: event.name,
                eventDate: event.date
            });
        } else {
            // Business Rule: For open events, we send the full confirmation package immediately.
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
 * Notifies a participant when an organizer manually updates their registration status.
 *
 * @param {Pick<Event, 'name' | 'date'>} event
 * @param {{ email: string, name: string }} userData
 * @param {boolean} newStatus - True for Approved, False for Rejected/Revoked.
 * @param {string} [qrCodeDataUrl] - QR code attachment, only included if status is now Approved.
 * @returns {Promise<{ success: boolean, error?: string }>}
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
            // Business Rule: Approval triggers a congratulatory email with access details.
            result = await sendApprovedEmail({
                to: userData.email,
                name: userData.name,
                eventName: event.name,
                eventDate: event.date,
                qrCodeDataUrl
            });
        } else {
            // Business Rule: Rejection sends a polite "not this time" message.
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
