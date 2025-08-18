import nodemailer, { SentMessageInfo } from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || '587', 10),
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<SentMessageInfo> {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || '"Kofa" <no-reply@kofa.ai>',
      to,
      subject,
      html,
    });
    return info;
  } catch (error) {
    throw new Error(`Failed to send email: ${(error as Error).message}`);
  }
}