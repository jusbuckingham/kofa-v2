import nodemailer, { SentMessageInfo, Transporter } from 'nodemailer';

// --- Types ---
export interface MailParams {
  to: string;
  subject: string;
  html: string;
}

// --- Env parsing & validation ---
const MAIL_HOST = process.env.MAIL_HOST;
const RAW_MAIL_PORT = process.env.MAIL_PORT;
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const MAIL_FROM = process.env.MAIL_FROM || '"Kofa" <no-reply@kofa.ai>';

const MAIL_PORT = Number.isFinite(Number(RAW_MAIL_PORT)) ? Number(RAW_MAIL_PORT) : 587;

if (!MAIL_HOST || !MAIL_USER || !MAIL_PASS) {
  // Fail fast with a clear configuration error.
  throw new Error(
    '[mailer] Missing required environment variables. Please set MAIL_HOST, MAIL_USER, MAIL_PASS (and optionally MAIL_PORT, MAIL_FROM).'
  );
}

// If port is 465, use secure SMTP; otherwise, STARTTLS is typical on 587
const secure = MAIL_PORT === 465;

const transporter: Transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: MAIL_PORT,
  secure,
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS,
  },
});

export async function sendMail({ to, subject, html }: MailParams): Promise<SentMessageInfo> {
  try {
    const info = await transporter.sendMail({
      from: MAIL_FROM,
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