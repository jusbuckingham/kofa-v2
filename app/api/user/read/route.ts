// app/api/user/read/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { incrementSummaryView, peekSummaryQuota } from "@/lib/quota";

const FREE_SUMMARIES_PER_DAY = 3;

// GET = just check quota
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await peekSummaryQuota(token.email);
  return NextResponse.json(res);
}

// POST = increment (call when a story is actually opened)
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let increment = true;
  try {
    const body: unknown = await req.json().catch(() => ({}));
    if (
      typeof body === "object" &&
      body !== null &&
      "increment" in body &&
      typeof (body as { increment: unknown }).increment === "boolean"
    ) {
      increment = (body as { increment: boolean }).increment;
    }
  } catch {
    // ignore malformed JSON; keep default increment=true
  }

  const res = increment
    ? await incrementSummaryView(token.email)
    : await peekSummaryQuota(token.email);

  if (!res.allowed) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        message: `Free quota of ${FREE_SUMMARIES_PER_DAY} summaries per day reached.`,
        ...res,
      },
      { status: 402 }
    );
  }

  return NextResponse.json(res);
}