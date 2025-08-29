// app/api/user/read/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { incrementSummaryView, peekSummaryQuota } from "@/lib/quota";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

const envFree = Number(process.env.FREE_SUMMARIES_PER_DAY);
const FREE_SUMMARIES_PER_DAY = Number.isFinite(envFree) ? envFree : 3;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET = just check quota
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // If the user is not signed in, return a safe default so the UI can render limits client-side.
  if (!token?.email) {
    return NextResponse.json(
      {
        hasActiveSub: false,
        summariesToday: 0,
        limit: FREE_SUMMARIES_PER_DAY,
        allowed: true,
      },
      { headers: { ...corsHeaders, "Cache-Control": "no-store" } }
    );
  }

  try {
    const res = await peekSummaryQuota(token.email);
    return NextResponse.json(
      {
        ...res,
        limit: FREE_SUMMARIES_PER_DAY,
      },
      { headers: { ...corsHeaders, "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error('[user/read GET] quota error:', err);
    return NextResponse.json(
      {
        hasActiveSub: false,
        summariesToday: 0,
        allowed: true,
        limit: FREE_SUMMARIES_PER_DAY,
        error: "internal_error",
      },
      { status: 500, headers: { ...corsHeaders, "Cache-Control": "no-store" } }
    );
  }
}

// POST = increment (call when a story is actually opened)
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { ...corsHeaders, "Cache-Control": "no-store" } }
    );
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

  try {
    const res = increment
      ? await incrementSummaryView(token.email)
      : await peekSummaryQuota(token.email);

    if (!res.allowed) {
      return NextResponse.json(
        {
          ...res,
          error: "quota_exceeded",
          message: `Free quota of ${FREE_SUMMARIES_PER_DAY} summaries per day reached.`,
          limit: FREE_SUMMARIES_PER_DAY,
        },
        { status: 429, headers: { ...corsHeaders, "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        ...res,
        limit: FREE_SUMMARIES_PER_DAY,
      },
      { headers: { ...corsHeaders, "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error('[user/read POST] quota error:', err);
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500, headers: { ...corsHeaders, "Cache-Control": "no-store" } }
    );
  }
}