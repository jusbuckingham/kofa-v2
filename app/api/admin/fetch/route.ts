export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import fetchNewsFromSource from "@/lib/fetchNews";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  // Accept either `Authorization: Bearer <token>` or raw token in Authorization
  const rawAuth = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const token = rawAuth.startsWith("Bearer ") ? rawAuth.slice(7) : rawAuth.trim();

  if (!secret || token !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    // Fetch and store new stories
    const result = await fetchNewsFromSource();
    const inserted = typeof result?.inserted === "number" ? result.inserted : 0;
    const storiesCount = Array.isArray(result?.stories) ? result.stories.length : 0;

    // We avoid returning full story payloads from an admin fetch for safety and payload size.
    return NextResponse.json({ ok: true, inserted, storiesCount }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Fetch failed", details: String(err) }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}