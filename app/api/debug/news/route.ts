import { NextResponse } from "next/server";
import { clientPromise } from "@/lib/mongoClient";

// Lightweight shape of a summary we’ll return
type SummaryProbe = {
  id: string;
  title: string;
  source: string;
  url?: string;
  imageUrl?: string;
  publishedAt?: string;
  createdAt?: string;
};

type Counts = {
  summaries: number;
  favorites?: number;
  userMetadata?: number;
};

type ProbeResponse = {
  ok: boolean;
  env: "development" | "production" | "test";
  counts: Counts;
  latest?: SummaryProbe | null;
  note?: string;
};

export async function GET() {
  // Safety guard: only respond if enabled (or not production)
  const nodeEnv = (process.env.NODE_ENV || "development") as
    | "development"
    | "production"
    | "test";
  const debugEnabled =
    nodeEnv !== "production" || process.env.DEBUG_ENABLE === "true";

  if (!debugEnabled) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    // Collections we care about
    const summariesCol = db.collection("summaries");
    const favoritesCol = db.collection("favorites");
    const userMetaCol = db.collection("userMetadata");

    // Counts
    const [summariesCount, favoritesCount, userMetaCount] = await Promise.all([
      summariesCol.countDocuments({}),
      favoritesCol.countDocuments({}).catch(() => 0), // in case not present yet
      userMetaCol.countDocuments({}).catch(() => 0),
    ]);

    // Latest summary (by createdAt fallback to publishedAt)
    const latestDoc = await summariesCol
      .find({})
      .project({
        _id: 0,
        id: 1,
        title: 1,
        source: 1,
        url: 1,
        imageUrl: 1,
        publishedAt: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1, publishedAt: -1 })
      .limit(1)
      .next();

    const latest: SummaryProbe | null = latestDoc
      ? {
          id: String(latestDoc.id ?? ""),
          title: String(latestDoc.title ?? ""),
          source: String(latestDoc.source ?? ""),
          url: latestDoc.url ? String(latestDoc.url) : undefined,
          imageUrl: latestDoc.imageUrl ? String(latestDoc.imageUrl) : undefined,
          publishedAt: latestDoc.publishedAt
            ? new Date(latestDoc.publishedAt).toISOString()
            : undefined,
          createdAt: latestDoc.createdAt
            ? new Date(latestDoc.createdAt).toISOString()
            : undefined,
        }
      : null;

    const payload: ProbeResponse = {
      ok: true,
      env: nodeEnv,
      counts: {
        summaries: summariesCount,
        favorites: favoritesCount,
        userMetadata: userMetaCount,
      },
      latest,
      note:
        "If summaries=0, trigger POST /api/news/fetch once, then reload the homepage.",
    };

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Debug probe failed",
      },
      { status: 500 }
    );
  }
}