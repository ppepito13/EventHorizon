
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
 * Wysyła potwierdzenie dla wydarzeń otwartych (z opcjonalnym kodem QR).
 */
export async function sendConfirmationEmail(payload: EmailPayload): Promise<{ success: boolean, error?: string }> {
    const { to, name, eventName, eventDate, qrCodeDataUrl } = payload;
    
    if (!process.env.RESEND_API_KEY) return { success: false, error: 'Email service is not configured.' };

    const qrSection = qrCodeDataUrl ? `
        <p>Poniżej znajduje się Twój unikalny kod QR. Prosimy o jego okazanie podczas wejścia na teren wydarzenia.</p>
        <div style="text-align: center; margin: 20px 0;">
            <img src="${qrCodeDataUrl}" alt="Twój kod QR" style="border: 1px solid #ddd; padding: 10px; background: white; width: 200px; height: 200px;"/>
        </div>
    ` : '<p>Wydarzenie odbędzie się w formie online. Szczegóły dotyczące dołączenia prześlemy w osobnej wiadomości.</p>';

    try {
        const { error } = await resend.emails.send({
            from: `"${eventName} Team" <${fromAddress}>`,
            to: [to],
            subject: `Potwierdzenie rejestracji: ${eventName}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h2>Witaj ${name},</h2>
                    <p>Dziękujemy za Twoją rejestrację na wydarzenie <strong>${eventName}</strong>, które odbędzie się ${eventDate}.</p>
                    ${qrSection}
                    <p>Do zobaczenia!</p>
                    <p><em>Zespół organizacyjny ${eventName}</em></p>
                </div>
            `,
        });
        return error ? { success: false, error: error.message } : { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Wysyła powiadomienie o zapisaniu wniosku (dla wydarzeń z zatwierdzeniem).
 */
export async function sendPendingEmail(payload: EmailPayload): Promise<{ success: boolean, error?: string }> {
    const { to, name, eventName } = payload;
    
    if (!process.env.RESEND_API_KEY) return { success: false, error: 'Email service is not configured.' };

    try {
        const { error } = await resend.emails.send({
            from: `"${eventName} Team" <${fromAddress}>`,
            to: [to],
            subject: `Otrzymaliśmy Twoje zgłoszenie: ${eventName}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h2>Witaj ${name},</h2>
                    <p>Dziękujemy za zainteresowanie wydarzeniem <strong>${eventName}</strong>.</p>
                    <p>Twoje zgłoszenie zostało zapisane w naszym systemie i obecnie <strong>oczekuje na akceptację organizatora</strong>.</p>
                    <p>Poinformujemy Cię w kolejnej wiadomości o zmianie statusu Twojej rejestracji. Prosimy o cierpliwość.</p>
                    <p>Pozdrawiamy,</p>
                    <p><em>Zespół organizacyjny ${eventName}</em></p>
                </div>
            `,
        });
        return error ? { success: false, error: error.message } : { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Wysyła informację o zaakceptowaniu rejestracji (z opcjonalnym kodem QR).
 */
export async function sendApprovedEmail(payload: EmailPayload): Promise<{ success: boolean, error?: string }> {
    const { to, name, eventName, eventDate, qrCodeDataUrl } = payload;
    
    if (!process.env.RESEND_API_KEY) return { success: false, error: 'Email service is not configured.' };

    const qrSection = qrCodeDataUrl ? `
        <p>Poniżej przesyłamy Twój unikalny kod QR, który będzie potrzebny do wejścia na wydarzenie:</p>
        <div style="text-align: center; margin: 20px 0;">
            <img src="${qrCodeDataUrl}" alt="Twój kod QR" style="border: 1px solid #ddd; padding: 10px; background: white; width: 200px; height: 200px;"/>
        </div>
    ` : '<p>Wydarzenie odbędzie się online. Wkrótce otrzymasz instrukcje dotyczące sposobu logowania.</p>';

    try {
        const { error } = await resend.emails.send({
            from: `"${eventName} Team" <${fromAddress}>`,
            to: [to],
            subject: `Twoje zgłoszenie zostało zatwierdzone: ${eventName}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h2>Dobra wiadomość, ${name}!</h2>
                    <p>Twoja rejestracja na wydarzenie <strong>${eventName}</strong> (${eventDate}) została właśnie <strong>zatwierdzona</strong> przez organizatora.</p>
                    ${qrSection}
                    <p>Cieszymy się na spotkanie z Tobą!</p>
                    <p><em>Zespół organizacyjny ${eventName}</em></p>
                </div>
            `,
        });
        return error ? { success: false, error: error.message } : { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Wysyła informację o odrzuceniu zgłoszenia.
 */
export async function sendRejectedEmail(payload: EmailPayload): Promise<{ success: boolean, error?: string }> {
    const { to, name, eventName } = payload;
    
    if (!process.env.RESEND_API_KEY) return { success: false, error: 'Email service is not configured.' };

    try {
        const { error } = await resend.emails.send({
            from: `"${eventName} Team" <${fromAddress}>`,
            to: [to],
            subject: `Informacja o statusie zgłoszenia: ${eventName}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h2>Witaj ${name},</h2>
                    <p>Dziękujemy za zainteresowanie wydarzeniem <strong>${eventName}</strong>.</p>
                    <p>Pragniemy poinformować, że po analizie zgłoszeń, Twoja rejestracja <strong>nie została zaakceptowana</strong> przez organizatorów.</p>
                    <p>Mamy nadzieję, że zobaczymy się przy okazji kolejnych wydarzeń.</p>
                    <p>Pozdrawiamy,</p>
                    <p><em>Zespół organizacyjny ${eventName}</em></p>
                </div>
            `,
        });
        return error ? { success: false, error: error.message } : { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
