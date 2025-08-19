import nodemailer, { SentMessageInfo, Transporter } from 'nodemailer';

// --- Types ---
export interface MailParams {
  to: string;
  subject: string;
  html: string;
}

// --- Env parsing & validation ---
const EMAIL_SERVER_HOST = process.env.EMAIL_SERVER_HOST;
const RAW_EMAIL_SERVER_PORT = process.env.EMAIL_SERVER_PORT;
const EMAIL_SERVER_USER = process.env.EMAIL_SERVER_USER;
const EMAIL_SERVER_PASSWORD = process.env.EMAIL_SERVER_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || '"Kofa" <no-reply@kofa.ai>';

const EMAIL_SERVER_PORT = Number.isFinite(Number(RAW_EMAIL_SERVER_PORT)) ? Number(RAW_EMAIL_SERVER_PORT) : 587;

if (!EMAIL_SERVER_HOST || !EMAIL_SERVER_USER || !EMAIL_SERVER_PASSWORD) {
  // Fail fast with a clear configuration error.
  throw new Error(
    '[mailer] Missing required environment variables. Please set EMAIL_SERVER_HOST, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD (and optionally EMAIL_SERVER_PORT, EMAIL_FROM).'
  );
}

// If port is 465, use secure SMTP; otherwise, STARTTLS is typical on 587
const secure = EMAIL_SERVER_PORT === 465;

const transporter: Transporter = nodemailer.createTransport({
  host: EMAIL_SERVER_HOST,
  port: EMAIL_SERVER_PORT,
  secure,
  auth: {
    user: EMAIL_SERVER_USER,
    pass: EMAIL_SERVER_PASSWORD,
  },
});

export async function sendMail({ to, subject, html }: MailParams): Promise<SentMessageInfo> {
  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
    return info;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[mailer] Failed to send email: ${message}`);
  }
}