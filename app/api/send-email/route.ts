import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';

export async function POST(req: Request) {
  const { to, subject, html } = await req.json();

  try {
    const info = await sendMail({ to, subject, html });
    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email error:', err);
    return NextResponse.json({ ok: false, error: 'Email failed to send' }, { status: 500 });
  }
}