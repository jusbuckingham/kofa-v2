// app/api/news/fetch/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse, NextRequest } from "next/server";
import { fetchAndStoreNews } from "@/lib/fetchNews";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { inserted } = await fetchAndStoreNews();
    return NextResponse.json({ ok: true, inserted }, { status: 200 });
  } catch (err) {
    console.error("Error in /api/news/fetch:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}