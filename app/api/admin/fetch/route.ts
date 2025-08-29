export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import fetchNewsFromSource from "@/lib/fetchNews";
import { clientPromise } from "@/lib/mongoClient";

// Basic audit & rate limit settings (safe defaults)
// You can override the limit via env: ADMIN_FETCH_MAX_PER_HOUR
const ACTION = "admin_fetch";
const WINDOW_MINUTES = 60;

function getRequestIp(req: Request): string {
  // Vercel/Next behind proxies typically set x-forwarded-for
  const xf = req.headers.get("x-forwarded-for") || "";
  const first = xf.split(",")[0]?.trim();
  const ip = first || req.headers.get("x-real-ip") || "";
  return ip || "unknown";
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const maxPerHour = Number(process.env.ADMIN_FETCH_MAX_PER_HOUR || "6");

  // Accept either `Authorization: Bearer &lt;token&gt;` or raw token in Authorization
  const rawAuth =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    "";

  if (!rawAuth) {
    return NextResponse.json(
      { ok: false, error: "Missing authorization header" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const token = rawAuth.startsWith("Bearer ")
    ? rawAuth.slice(7)
    : rawAuth.trim();

  if (!secret || token !== secret) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Connect DB for rate limit/audit (best-effort; if it fails we still proceed but skip RL/audit)
  let dbOk = false;
  const startedAt = Date.now();
  const ip = getRequestIp(request);

  try {
    const client = await clientPromise;
    const db =
      client.db(process.env.MONGODB_DB || process.env.MONGODB_DATABASE || "kofa");
    const logs = db.collection("cron_logs");

    // --- Rate limit within the last WINDOW_MINUTES
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
    const recentCount = await logs.countDocuments({
      action: ACTION,
      createdAt: { $gte: windowStart },
    });

    if (recentCount >= maxPerHour) {
      // Audit the blocked attempt
      await logs.insertOne({
        action: ACTION,
        ip,
        ok: false,
        reason: "rate_limited",
        createdAt: new Date(),
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Rate limit exceeded",
          details: `Try again later. Limit: ${maxPerHour} per ${WINDOW_MINUTES} minutes.`,
        },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    dbOk = true;

    // Proceed to fetch and store new stories
    let inserted = 0;
    let storiesCount = 0;
    let errorMessage: string | null = null;

    try {
      const result = await fetchNewsFromSource();

      // Defensive: shape can vary
      inserted = typeof result?.inserted === "number" ? result.inserted : 0;
      storiesCount = Array.isArray(result?.stories) ? result.stories.length : 0;

      // Audit success
      await logs.insertOne({
        action: ACTION,
        ip,
        ok: true,
        inserted,
        storiesCount,
        durationMs: Date.now() - startedAt,
        createdAt: new Date(),
      });

      return NextResponse.json(
        { ok: true, inserted, storiesCount },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);

      // Audit failure
      await logs.insertOne({
        action: ACTION,
        ip,
        ok: false,
        reason: "fetch_failed",
        error: errorMessage,
        durationMs: Date.now() - startedAt,
        createdAt: new Date(),
      });

      return NextResponse.json(
        { ok: false, error: "Fetch failed", details: errorMessage },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }
  } catch {
    // If DB is unavailable, perform fetch without rate limiting/audit
    try {
      const result = await fetchNewsFromSource();
      const inserted =
        typeof result?.inserted === "number" ? result.inserted : 0;
      const storiesCount = Array.isArray(result?.stories)
        ? result.stories.length
        : 0;

      return NextResponse.json(
        {
          ok: true,
          inserted,
          storiesCount,
          // surface that audit/rate-limit was skipped
          meta: { audit: dbOk, rateLimited: false, dbConnected: false },
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        {
          ok: false,
          error: "Fetch failed (no audit)",
          details: message,
          meta: { audit: dbOk, rateLimited: false, dbConnected: false },
        },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }
  }
}