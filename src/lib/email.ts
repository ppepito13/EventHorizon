import { Resend } from 'resend';

interface EmailPayload {
    to: string;
    name: string;
    eventName: string;
    eventDate: string;
    qrCodeDataUrl?: string;
}

// Instantiate Resend. The API key is read from environment variables.
const resend = new Resend(process.env.RESEND_API_KEY);

// Use a fallback 'from' address for testing, as Resend requires verified domains.
// Users should set RESEND_FROM_EMAIL to their own verified email address.
const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

/**
 * Sends confirmation for open events (with optional QR code).
 */
export async function sendConfirmationEmail(payload: EmailPayload): Promise<{ success: boolean, error?: string }> {
    const { to, name, eventName, eventDate, qrCodeDataUrl } = payload;
    
    if (!process.env.RESEND_API_KEY) return { success: false, error: 'Email service is not configured.' };

    const qrSection = qrCodeDataUrl ? `
        <p>Below is your unique QR code. Please show it at the event entrance.</p>
        <div style="text-align: center; margin: 20px 0;">
            <img src="${qrCodeDataUrl}" alt="Your QR Code" style="border: 1px solid #ddd; padding: 10px; background: white; width: 200px; height: 200px;"/>
        </div>
    ` : '<p>The event will take place online. Joining details will be sent in a separate message.</p>';

    try {
        const { error } = await resend.emails.send({
            from: `"${eventName} Team" <${fromAddress}>`,
            to: [to],
            subject: `Registration Confirmation: ${eventName}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h2>Hello ${name},</h2>
                    <p>Thank you for registering for <strong>${eventName}</strong>, taking place on ${eventDate}.</p>
                    ${qrSection}
                    <p>See you there!</p>
                    <p><em>${eventName} Organizing Team</em></p>
                </div>
            `,
        });
        return error ? { success: false, error: error.message } : { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Sends notification about application submission (for events requiring approval).
 */
export async function sendPendingEmail(payload: EmailPayload): Promise<{ success: boolean, error?: string }> {
    const { to, name, eventName } = payload;
    
    if (!process.env.RESEND_API_KEY) return { success: false, error: 'Email service is not configured.' };

    try {
        const { error } = await resend.emails.send({
            from: `"${eventName} Team" <${fromAddress}>`,
            to: [to],
            subject: `We received your application: ${eventName}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h2>Hello ${name},</h2>
                    <p>Thank you for your interest in <strong>${eventName}</strong>.</p>
                    <p>Your application has been received and is currently <strong>awaiting organizer approval</strong>.</p>
                    <p>We will notify you in a separate email regarding your registration status. Thank you for your patience.</p>
                    <p>Best regards,</p>
                    <p><em>${eventName} Organizing Team</em></p>
                </div>
            `,
        });
        return error ? { success: false, error: error.message } : { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Sends notification about approved registration (with optional QR code).
 */
export async function sendApprovedEmail(payload: EmailPayload): Promise<{ success: boolean, error?: string }> {
    const { to, name, eventName, eventDate, qrCodeDataUrl } = payload;
    
    if (!process.env.RESEND_API_KEY) return { success: false, error: 'Email service is not configured.' };

    const qrSection = qrCodeDataUrl ? `
        <p>Below is your unique QR code, which you will need to enter the event:</p>
        <div style="text-align: center; margin: 20px 0;">
            <img src="${qrCodeDataUrl}" alt="Your QR Code" style="border: 1px solid #ddd; padding: 10px; background: white; width: 200px; height: 200px;"/>
        </div>
    ` : '<p>The event will be held online. You will soon receive instructions on how to log in.</p>';

    try {
        const { error } = await resend.emails.send({
            from: `"${eventName} Team" <${fromAddress}>`,
            to: [to],
            subject: `Your application has been approved: ${eventName}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h2>Great news, ${name}!</h2>
                    <p>Your registration for <strong>${eventName}</strong> (${eventDate}) has been <strong>approved</strong> by the organizer.</p>
                    ${qrSection}
                    <p>We look forward to seeing you!</p>
                    <p><em>${eventName} Organizing Team</em></p>
                </div>
            `,
        });
        return error ? { success: false, error: error.message } : { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Sends notification about rejected registration.
 */
export async function sendRejectedEmail(payload: EmailPayload): Promise<{ success: boolean, error?: string }> {
    const { to, name, eventName } = payload;
    
    if (!process.env.RESEND_API_KEY) return { success: false, error: 'Email service is not configured.' };

    try {
        const { error } = await resend.emails.send({
            from: `"${eventName} Team" <${fromAddress}>`,
            to: [to],
            subject: `Application Status Update: ${eventName}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h2>Hello ${name},</h2>
                    <p>Thank you for your interest in <strong>${eventName}</strong>.</p>
                    <p>We regret to inform you that after reviewing the applications, your registration <strong>was not approved</strong> by the organizers.</p>
                    <p>We hope to see you at future events.</p>
                    <p>Best regards,</p>
                    <p><em>${eventName} Organizing Team</em></p>
                </div>
            `,
        });
        return error ? { success: false, error: error.message } : { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
