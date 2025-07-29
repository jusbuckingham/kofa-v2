// app/api/test-summarize.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import summarizeWithPerspective from '@/lib/summarize';

export async function GET() {
  try {
    // Sample snippet for testing the summarizer
    const sample = `In a historic move, civil rights leaders gathered in Atlanta to discuss the future of Black empowerment initiatives.`;
    const summary = await summarizeWithPerspective(sample);
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error('Test summarizer error:', err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
