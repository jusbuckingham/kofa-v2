export const dynamic = "force-dynamic";
export const revalidate = 0;
// app/api/news/fetch/route.ts
import { NextResponse } from "next/server";
import fetchNewsFromSource from "@/lib/fetchNews";
import { getDb } from "@/lib/mongoClient";
import { MongoBulkWriteError } from "mongodb";

import summarizeWithPerspective from "@/lib/summarize";

// ---- Ingestion tuning knobs (env-driven) ----
const NEWS_RELAX = process.env.NEWS_RELAX === "1" || process.env.NEWS_RELAX === "true";
const NEWS_DEBUG = process.env.NEWS_DEBUG === "1" || process.env.NEWS_DEBUG === "true";
const NEWS_MIN_LEN = Number.parseInt(process.env.NEWS_MIN_LEN || "", 10);
const NEWS_MIN_LEN_TRUSTED = Number.parseInt(process.env.NEWS_MIN_LEN_TRUSTED || "", 10);

// relaxed defaults if env not set
const MIN_LEN_DEFAULT = Number.isFinite(NEWS_MIN_LEN) ? NEWS_MIN_LEN : 120;
const MIN_LEN_TRUSTED_DEFAULT = Number.isFinite(NEWS_MIN_LEN_TRUSTED) ? NEWS_MIN_LEN_TRUSTED : 80;

// Hard blocks we always keep (even in relaxed mode): PR wires
const HARD_BLOCKED_DOMAINS = new Set<string>([
  "prnewswire.com",
  "businesswire.com",
  "globenewswire.com",
  "newswire.com",
]);

// URL paths that are almost certainly press/sponsored (always block)
const URL_HARD_JUNK: RegExp[] = [
  /\/press(-|_)?release\//i,
  /\/sponsored\//i,
];

function looksJunkRelaxed(title?: string, description?: string): boolean {
  const s = `${title || ""} ${description || ""}`;
  return /(press release|press-release|sponsored)/i.test(s);
}

function isTrustedOrBlackDomain(domain?: string) {
  if (!domain) return false;
  const d = domain.toLowerCase();
  return TRUSTED_DOMAINS.has(d) || BLACK_PUBLISHER_DOMAINS.has(d);
}

/** Raw shape coming back from feeds/parsers */
type IngestStory = {
  id?: string;
  url?: string;
  link?: string;
  title?: string;
  headline?: string;
  source?: string;
  publishedAt?: string | Date;
  pubDate?: string | Date;
  content?: string;
  description?: string;
  snippet?: string;
  excerpt?: string;
  imageUrl?: string;
  image?: string;
};

/** Normalized document we insert into `stories` */
interface NormalizedStory {
  id: string;
  url: string;
  title: string;
  source: string;
  publishedAt: string; // ISO
  imageUrl?: string;
  // keep original text fields for future models/debugging
  raw?: {
    content?: string;
    description?: string;
    snippet?: string;
    excerpt?: string;
  };
}


// --- helpers ---------------------------------------------------------------
function clampBullet(s: string, max = 120): string {
  const str = (s || "").trim().replace(/\s+/g, " ");
  if (str.length <= max) return str;
  const sub = str.slice(0, max);
  const lastStop = Math.max(sub.lastIndexOf("."), sub.lastIndexOf("!"), sub.lastIndexOf("?"));
  return (lastStop > 50 ? sub.slice(0, lastStop + 1) : sub).trim();
}

async function extractOgImage(url: string): Promise<string | undefined> {
  try {
    if (!/^https?:\/\//i.test(url)) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      // Some publishers block non-browser UAs; present a friendly UA.
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 KofaBot/1.0",
        "Accept": "text/html,application/xhtml+xml"
      }
    });
    clearTimeout(timer);

    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("text/html")) return undefined;

    const html = await res.text();
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    if (ogMatch?.[1]) return ogMatch[1];
    const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    if (twMatch?.[1]) return twMatch[1];
  } catch {
    // ignore network/parse/abort errors
  }
  return undefined;
}

function toDomain(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function toISO(value?: string | Date): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.toISOString();
}

async function mapInBatches<T, U>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<U>
): Promise<U[]> {
  const out: U[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(fn));
    out.push(...results);
  }
  return out;
}

// --- relevance & junk filtering --------------------------------------------
const BLOCKED_DOMAINS = new Set(
  [
    // PR wires / advertorial-heavy
    "prnewswire.com",
    "businesswire.com",
    "globenewswire.com",
    "newswire.com",
    // low-signal clickbait or coupon/deals
    "dealnews.com",
    "slickdeals.net",
    // noisy/low-signal source seen in prod
    "manilatimes.net",
  ].map((d) => d.toLowerCase())
);


const JUNK_PATTERNS: RegExp[] = [
  /\b(sponsored|sponsored content|advertorial)\b/i,
  /\b(promo|deal|discount|sale|coupon|giveaway|sweepstake)\b/i,
  /\bbetting|odds|sportsbook|casino\b/i,
  /\bhoroscope\b/i,
];

const EXTRA_JUNK_PATTERNS: RegExp[] = [
  /\b(exclusive offer|special offer|limited time|flash sale|holiday sale|labor day|black friday|cyber monday)\b/i,
  /\b(discount|deal|sale|promo|promotion|coupon|voucher|markdown|bargain|clearance)\b/i,
  /\b(prices?|savings?|save \$?\d+|save \d+%|\d+% off|buy one get one|bogo)\b/i,
  /\b(sponsored|partner(ed)? content|brand(ed)? content|paid post)\b/i,
  /\b(giveaway|contest|sweepstake|raffle)\b/i,
];

const URL_JUNK_PATTERNS: RegExp[] = [
  /\/pr\//i,
  /\/press(-|_)?release\//i,
  /\/sponsored\//i,
  /\/partner(s|ed)?\//i,
  /\/advertorial\//i,
  /\/deals?\//i,
  /\/coupons?\//i,
];

function isRecent(iso?: string | Date, hours = 72): boolean {
  const d = iso ? new Date(iso) : new Date(0);
  return Date.now() - d.getTime() <= hours * 3600_000;
}

function looksJunk(title?: string, description?: string): boolean {
  const s = `${title || ""} ${description || ""}`;
  return (
    JUNK_PATTERNS.some((rx) => rx.test(s)) ||
    EXTRA_JUNK_PATTERNS.some((rx) => rx.test(s))
  );
}

// --- tuning for "top" and "black" lenses ----------------------------------
const TRUSTED_DOMAINS = new Set(
  [
    "nytimes.com",
    "washingtonpost.com",
    "reuters.com",
    "apnews.com",
    "npr.org",
    "bbc.com",
    "theguardian.com",
    "latimes.com",
    "bloomberg.com",
    "wsj.com",
    "politico.com",
    "axios.com",
    "aljazeera.com",
    "propublica.org",
    "pbs.org",
    "time.com",
    "usatoday.com",
    "abcnews.go.com",
    "nbcnews.com",
    "cbsnews.com",
    "cnn.com",
  ].map((d) => d.toLowerCase())
);

const BLACK_PUBLISHER_DOMAINS = new Set(
  [
    "thegrio.com",
    "theroot.com",
    "capitalbnews.org",
    "blavity.com",
    "essence.com",
    "andscape.com",
    "lasentinel.net",
    "amsterdamnews.com",
    "afro.com",
    "defendernetwork.com",
    "blackenterprise.com",
    "thecharlottepost.com",
    "theatlantavoice.com",
    "washingtoninformer.com",
  ].map((d) => d.toLowerCase())
);

// Terms that frequently indicate Black news / civil-rights relevance
const BLACK_PATTERNS: RegExp[] = [
  /\bblack\b/i,
  /\bafrican[- ]american(s)?\b/i,
  /\bcivil rights?\b/i,
  /\bvoting rights?\b/i,
  /\bnaacp\b/i,
  /\bhbcu(s)?\b/i,
  /\bpolice(\b|[- ]?brutality)\b/i,
  /\bpolicing\b/i,
  /\bdisparities?\b/i,
  /\b(redlining|mass incarceration|environmental justice)\b/i,
  /\bjuneteenth\b/i,
  /\b(black lives matter|blm)\b/i,
  /\b(lynching|racial profiling|racial justice)\b/i,
];

function countMatches(rxList: RegExp[], title?: string, body?: string): number {
  const s = `${title || ""} ${body || ""}`;
  let hits = 0;
  for (const rx of rxList) {
    if (rx.test(s)) hits += 1;
  }
  return hits;
}

function scoreStoryForLens(
  s: IngestStory,
  _lens: "top" | "black"
): { score: number; blackHits: number; domain: string } {
  const url = s.url || s.link || "";
  const domain = toDomain(url).toLowerCase();
  const title = s.title || s.headline || "";
  const body = s.content || s.description || s.snippet || s.excerpt || "";

  let score = 0;

  // Trust signals
  if (domain && TRUSTED_DOMAINS.has(domain)) score += 3;

  // Boost for Black-focused publishers (higher when lens === "black")
  const blackBoostBase = Number(process.env.NEWS_BLACK_DOMAIN_BOOST || 2);
  if (domain && BLACK_PUBLISHER_DOMAINS.has(domain)) {
    score += (_lens === "black" ? blackBoostBase * 2 : blackBoostBase);
  }

  // Topical/recency cues in the headline
  if (/\b(breaking|live|update|exclusive)\b/i.test(title)) score += 1;

  // Penalize obvious non-news commentary in headline
  if (/\b(opinion|op\-ed|editorial)\b/i.test(title)) score -= 2;

  // Black-lens signal (only boost when lens === "black")
  const blackHits = countMatches(BLACK_PATTERNS, title, body);
  if (_lens === "black" && blackHits) score += Math.min(blackHits, 3) * 2; // cap boost

  // Slight boost for longer body (more substance), capped
  const len = body.trim().length;
  if (len > 400) score += 1;
  if (len > 1200) score += 1;

  return { score, blackHits, domain };
}

// --- route -----------------------------------------------------------------
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("Authorization")?.split(" ")[1];
  const isDev = process.env.NODE_ENV !== "production";

  // NEW: allow scheduled Vercel Cron calls in production via headers
  const vercelCronHeader =
    request.headers.get("x-vercel-cron") || request.headers.get("x-vercel-schedule");

  // In production, accept either the Vercel Cron header or the shared secret
  // Optional: allow unauthenticated dry-run reads when ALLOW_FETCH_DRYRUN_PUBLIC=1
  const urlObj = new URL(request.url);
  const sp = urlObj.searchParams;
  const allowPublicDryRun = process.env.ALLOW_FETCH_DRYRUN_PUBLIC === "1";
  if (
    !isDev &&
    !vercelCronHeader &&
    (!secret || authHeader !== secret) &&
    !(allowPublicDryRun && (sp.get("dryRun") === "1" || sp.get("dry") === "1"))
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Parse optional query parameters for filtering and control
  // urlObj and sp already declared above
  const sourceParam = sp.get("source"); // e.g. "bbc.com,nytimes.com,BBC"
  const q = sp.get("q")?.trim() || ""; // free-text match
  const fromStr = sp.get("from"); // ISO date
  const toStr = sp.get("to"); // ISO date
  const limitParam = sp.get("limit");
  const limitNum = limitParam ? Math.max(1, Math.min(1000, Number(limitParam) || 0)) : undefined; // hard cap
  const dryRun = sp.get("dryRun") === "1" || sp.get("dry") === "1"; // if true, do not write to DB
  const includeMeta = sp.get("meta") === "1" || sp.get("includeMeta") === "1"; // attach summary meta in response

  const focusParam = (sp.get("focus") || sp.get("lens") || "top").toLowerCase();
  const focus: "top" | "black" = focusParam === "black" ? "black" : "top";
  const minScoreParam = Number(sp.get("minScore") || "");
  const minScore = Number.isFinite(minScoreParam) ? minScoreParam : undefined;

  const wantedSources = sourceParam
    ? sourceParam
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : undefined;

  function withinRange(d?: string | Date): boolean {
    if (!fromStr && !toStr) return true;
    if (!d) return false;
    const dt = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return false;
    if (fromStr && dt < new Date(fromStr)) return false;
    if (toStr && dt > new Date(toStr)) return false;
    return true;
  }

  function matchesQuery(title?: string, body?: string): boolean {
    if (!q) return true;
    try {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      return rx.test(title || "") || rx.test(body || "");
    } catch {
      return (
        (title || "").toLowerCase().includes(q.toLowerCase()) ||
        (body || "").toLowerCase().includes(q.toLowerCase())
      );
    }
  }

  const { stories } = await fetchNewsFromSource();
  // Force the loose feed shape into our local ingest type so downstream
  // filtering/normalization can reference optional fields safely.
  const fetchedRaw = stories as unknown as IngestStory[];
  const debug = { fetched: 0, afterHard: 0, afterFilters: 0, toSummarize: 0, inserted: 0 };
  debug.fetched = fetchedRaw.length;
  if (NEWS_DEBUG) console.log("[fetch route] fetched:", debug.fetched);

  // Stage 1: hard filters only (always enforced)
  const afterHard: IngestStory[] = (fetchedRaw || []).filter((s) => {
    const url = s.url || s.link || "";
    const domainFull = toDomain(url);
    if (!url || !domainFull) return false;
    if (HARD_BLOCKED_DOMAINS.has(domainFull.toLowerCase())) return false; // PR wires
    if (URL_HARD_JUNK.some((rx) => rx.test(url))) return false; // sponsored/press paths
    return true;
  });
  debug.afterHard = afterHard.length;
  if (NEWS_DEBUG) console.log("[fetch route] afterHard:", debug.afterHard);

  // Stage 2: relaxed vs strict content/freshness filters
  let filtered: IngestStory[] = afterHard.filter((s) => {
    const url = s.url || s.link || "";
    const domainFull = toDomain(url);
    const domain = (s.source || domainFull).toLowerCase();
    const pub = s.publishedAt ?? s.pubDate;
    const title = s.title || s.headline || "";
    const body = s.content || s.description || s.snippet || s.excerpt || "";

    if (!NEWS_RELAX) {
      if (BLOCKED_DOMAINS.has(domainFull.toLowerCase())) return false;
      if (looksJunk(title, body)) return false;
      if (URL_JUNK_PATTERNS.some((rx) => rx.test(url))) return false;
      // strict: 120h freshness
      const timeOk = (!pub) || isRecent(pub as string | Date, 120);
      if (!timeOk) return false;
    } else {
      // relaxed: only very light junk screen, allow up to 7 days (168h)
      if (looksJunkRelaxed(title, body)) return false;
      const timeOk = (!pub) || isRecent(pub as string | Date, 168);
      if (!timeOk) return false;
    }

    // optional source filter
    const sourceOk = !wantedSources || wantedSources.some((ws) => domain.includes(ws) || url.toLowerCase().includes(ws));
    if (!sourceOk) return false;

    // optional text query
    if (!matchesQuery(title, body)) return false;
    // optional explicit date range filter from query
    if (!withinRange(pub as string | Date | undefined)) return false;
    return true;
  });
  debug.afterFilters = filtered.length;
  if (NEWS_DEBUG) console.log("[fetch route] afterFilters:", debug.afterFilters);

  // Lens-based scoring and ordering
  const scored = filtered.map((s) => {
    const { score, blackHits } = scoreStoryForLens(s, focus);
    return Object.assign({}, s, { __score: score, __blackHits: blackHits });
  }) as (IngestStory & { __score: number; __blackHits: number })[];

  let tuned = scored;
  if (focus === "black") {
    tuned = tuned.filter((s) => s.__blackHits > 0);
  }
  if (typeof minScore === "number") {
    tuned = tuned.filter((s) => s.__score >= minScore);
  }

  tuned.sort((a, b) => b.__score - a.__score);

  // Replace filtered with tuned ordering
  filtered = tuned as IngestStory[];

  // Optional hard limit of items to process
  if (typeof limitNum === "number") {
    filtered = filtered.slice(0, limitNum);
  }

  // Normalize for storage/summarization
  const normalized: NormalizedStory[] = await Promise.all(
    filtered.map(async (s) => {
      const url = s.url || s.link || "";
      const title = s.title || s.headline || "Untitled";
      const source = s.source || toDomain(url) || "";
      const publishedAt = toISO(s.publishedAt) ?? toISO(s.pubDate) ?? new Date().toISOString();
      const imageUrl = s.imageUrl || s.image || (await extractOgImage(url)) || undefined;
      const id = s.id || url; // use URL as id fallback
      return {
        id,
        url,
        title,
        source,
        publishedAt,
        imageUrl,
        raw: {
          content: s.content,
          description: s.description,
          snippet: s.snippet,
          excerpt: s.excerpt,
        },
      } satisfies NormalizedStory;
    })
  );

  // Connect to MongoDB
  const db = await getDb();
  const storiesColl = db.collection<NormalizedStory>("stories");

  // Ensure indexes (no-throw if already exist)
  try {
    await storiesColl.createIndex({ id: 1 }, { unique: true, background: true });
  } catch {
    // ignore index races
  }

  // Short-circuit if nothing to do
  if (!normalized.length) {
    return NextResponse.json(
      { ok: true, inserted: 0, upsertedSummaries: 0, count: 0, totalFetched: fetchedRaw.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // Try to insert new stories, ignore duplicates (requires unique index on stories.id)
  let insertedCount = 0;
  if (!dryRun) {
    try {
      const result = await storiesColl.insertMany(normalized, { ordered: false });
      insertedCount = result.insertedCount;
    } catch (err) {
      type BulkErr = MongoBulkWriteError & { code?: number; result?: { nInserted?: number } };
      const bulkErr = err as BulkErr;
      if (bulkErr instanceof MongoBulkWriteError && bulkErr.code === 11000) {
        insertedCount = bulkErr.result?.nInserted ?? 0;
      } else {
        throw err;
      }
    }
  }
  debug.inserted = insertedCount;
  if (NEWS_DEBUG) console.log("[fetch route] inserted stories:", debug.inserted);

  // Build summaries for each story and persist **inside** the `stories` collection
  type StoryUpdateOp = {
    updateOne: {
      filter: { id: string };
      update: { $set: Record<string, unknown> };
      upsert: boolean;
    };
  };

  const storyOps: StoryUpdateOp[] = await mapInBatches(normalized, 8, async (s) => {
    const body = s.raw?.content || s.raw?.description || s.raw?.snippet || s.raw?.excerpt || s.title;

    // Skip summarization for ad-like/very short bodies
    const compactLen = (body || "").replace(/\s+/g, "").length;
    let oneLiner = s.title;
    let bullets: string[] = ["", "", "", "", ""];
    if (!oneLiner || !oneLiner.trim()) {
      oneLiner = (s.title || "").trim();
    }

    const domain = toDomain(s.url);
    const minLen = isTrustedOrBlackDomain(domain) ? MIN_LEN_TRUSTED_DEFAULT : MIN_LEN_DEFAULT;
    if (NEWS_RELAX || compactLen >= minLen) {
      try {
        const ai = await summarizeWithPerspective(body);
        oneLiner = (ai.oneLiner || s.title).trim();
        const rawB = Array.isArray(ai.bullets) ? ai.bullets : [];
        const normalizedBullets = rawB.slice(0, 5);
        while (normalizedBullets.length < 5) normalizedBullets.push("");
        bullets = normalizedBullets.map((b) => clampBullet(b, 120));
      } catch (err) {
        if (process.env.NEWS_DEBUG === '1' || process.env.NEWS_DEBUG === 'true') {
          console.error('[fetch route] summarize failed', {
            url: s.url,
            title: s.title,
            err: String(err),
          });
        }
        // keep defaults
      }
    }

    const sources = [{ title: s.title, url: s.url, domain: toDomain(s.url) }];

    return {
      updateOne: {
        filter: { id: s.id },
        update: {
          $set: {
            oneLiner,
            bullets,
            summary: { oneLiner, bullets },
            sources,
          },
        },
        upsert: false,
      },
    };
  });

  let upserted = 0;
  if (storyOps.length && !dryRun) {
    try {
      const res = await storiesColl.bulkWrite(storyOps, { ordered: false });
      upserted = (res.upsertedCount ?? 0) + (res.modifiedCount ?? 0);
    } catch (err) {
      const bulkErr = err as MongoBulkWriteError;
      if (!(bulkErr instanceof MongoBulkWriteError && bulkErr.code === 11000)) {
        throw err;
      }
    }
  }

  const distinctSources = Array.from(new Set(normalized.map((n) => n.source).filter(Boolean))).sort();
  const latestPublishedAt = normalized
    .map((n) => new Date(n.publishedAt))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return NextResponse.json(
    {
      ok: true,
      inserted: insertedCount,
      upsertedSummaries: upserted,
      count: normalized.length,
      totalFetched: fetchedRaw.length,
      filters: {
        source: sourceParam || null,
        q: q || null,
        from: fromStr || null,
        to: toStr || null,
        limit: limitNum ?? null,
        dryRun,
        focus,
        minScore: typeof minScore === "number" ? minScore : null,
      },
      meta: includeMeta
        ? {
            sources: distinctSources,
            latestPublishedAt: latestPublishedAt ? latestPublishedAt.toISOString() : null,
            debug: NEWS_DEBUG ? debug : undefined,
          }
        : undefined,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}