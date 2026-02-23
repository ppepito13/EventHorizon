
import nodemailer from 'nodemailer';

interface EmailPayload {
    to: string;
    name: string;
    eventName: string;
    eventDate: string;
    qrCodeDataUrl: string;
}

const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
};

// Verify that all required SMTP environment variables are set
if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.auth.user || !smtp-Config.auth.pass) {
    console.warn(`
        WARN: SMTP environment variables are not fully configured.
        Email sending will be disabled.
        Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in your .env file.
    `);
}

const transporter = nodemailer.createTransport(smtpConfig);

export async function sendConfirmationEmail(payload: EmailPayload) {
    const { to, name, eventName, eventDate, qrCodeDataUrl } = payload;
    
    // Do not attempt to send if config is missing
    if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
        console.log("Skipping email send due to missing SMTP configuration.");
        return;
    }

    const mailOptions = {
        from: `"${eventName} Team" <${smtpConfig.auth.user}>`,
        to: to,
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
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Confirmation email sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        // Re-throwing the error allows the calling function to handle it
        throw new Error('Could not send confirmation email.');
    }
}
