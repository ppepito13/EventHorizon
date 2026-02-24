
import { Resend } from 'resend';

interface EmailPayload {
    to: string;
    name: string;
    eventName: string;
    eventDate: string;
    qrCodeDataUrl: string;
}

// Instantiate Resend. The API key is read from environment variables.
const resend = new Resend(process.env.RESEND_API_KEY);

// Use a fallback 'from' address for testing, as Resend requires verified domains.
// Users should set RESEND_FROM_EMAIL to their own verified email address.
const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export async function sendConfirmationEmail(payload: EmailPayload): Promise<{ success: boolean, error?: string }> {
    const { to, name, eventName, eventDate, qrCodeDataUrl } = payload;
    
    if (!process.env.RESEND_API_KEY) {
        console.warn(`
            WARN: RESEND_API_KEY is not set in the .env file.
            Email sending is disabled. The registration process will continue without sending an email.
        `);
        return { success: false, error: 'Email service is not configured.' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: `"${eventName} Team" <${fromAddress}>`,
            to: [to], // Resend API expects an array of strings
            subject: `Potwierdzenie rejestracji na wydarzenie: ${eventName}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6;">
                    <h2>Witaj ${name},</h2>
                    <p>Dziękujemy za Twoją rejestrację na wydarzenie <strong>${eventName}</strong>, które odbędzie się ${eventDate}.</p>
                    <p>Poniżej znajduje się Twój unikalny kod QR. Prosimy o jego okazanie podczas wejścia na teren wydarzenia.</p>
                    <div style="text-align: center; margin: 20px 0;">
                        <img src="${qrCodeDataUrl}" alt="Twój kod QR" style="border: 1px solid #ddd; padding: 10px; background: white;"/>
                    </div>
                    <p>Do zobaczenia!</p>
                    <p><em>Zespół organizacyjny ${eventName}</em></p>
                </div>
            `,
        });

        if (error) {
            console.error('Resend API returned an error:', error);
            return { success: false, error: error.message };
        } else {
            console.log('Confirmation email sent successfully via Resend:', data);
            return { success: true };
        }

    } catch (e) {
        const error = e as Error;
        console.error('Failed to execute sendConfirmationEmail:', error.message);
        return { success: false, error: error.message };
    }
}
