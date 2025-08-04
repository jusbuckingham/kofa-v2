import { NextResponse } from "next/server";
import fetchNewsFromSource from "@/lib/fetchNews";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("Authorization")?.split(" ")[1];

  if (!secret || authHeader !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch and store new stories
  const { inserted, stories } = await fetchNewsFromSource();

  return NextResponse.json({
    ok: true,
    inserted,
    stories,
  });
}