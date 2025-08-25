/**
 * lib/fetchNews.ts
 * Aggregates news from external providers (NewsData → fallback GNews),
 * summarizes with Kofa's perspective, and stores in MongoDB.
 */

import clientPromise from "@/lib/mongodb";
import summarizeWithPerspective from "@/lib/summarize";
import { fetchNewsData } from "@/lib/providers/newsdata";
import { fetchGNews } from "@/lib/providers/gnews";

// ---------- Helpers ----------
function getDomain(u?: string): string {
  try {
    return u ? new URL(u).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

/** Normalize URLs for dedupe: strip hash and common tracking params */
function normalizeUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    u.hash = "";
    const params = u.searchParams;
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "utm_name",
      "utm_id",
      "utm_creative",
      "gclid",
      "fbclid",
      "mc_cid",
      "mc_eid",
    ].forEach((k) => params.delete(k));
    u.search = params.toString() ? `?${params.toString()}` : "";
    return u.toString();
  } catch {
    return raw || undefined;
  }
}

/** Ensure ≤ max chars, tweety style */
function enforceLen(input: unknown, max = 120): string {
  if (!input || typeof input !== "string") return "";
  const s = input.trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

// ---------- Minimal RSS parsing (fallback) ----------
function extractTag(src: string, tag: string): string | undefined {
  const m = src.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1].trim() : undefined;
}

function stripCdata(s?: string): string {
  if (!s) return "";
  return s.replace(/<!\\[CDATA\\[/g, "").replace(/\\]\\]>/g, "").trim();
}

function parseRss(xml: string): Array<{ title?: string; url?: string; description?: string; publishedAt?: string; imageUrl?: string }> {
  const items: string[] = xml.split(/<item\b[\\s\\S]*?>/i).slice(1).map(chunk => {
    const end = chunk.indexOf("</item>");
    return end >= 0 ? chunk.slice(0, end) : chunk;
  });
  const out: Array<{ title?: string; url?: string; description?: string; publishedAt?: string; imageUrl?: string }> = [];
  for (const raw of items) {
    const title = stripCdata(extractTag(raw, "title"));
    const link = stripCdata(extractTag(raw, "link"));
    const desc = stripCdata(extractTag(raw, "description")) || stripCdata(extractTag(raw, "content:encoded"));
    const pub = stripCdata(extractTag(raw, "pubDate")) || stripCdata(extractTag(raw, "dc:date"));
    // naive media enclosure
    const mediaMatch = raw.match(/<media:content[^>]*url="([^"]+)"/i) || raw.match(/<enclosure[^>]*url="([^"]+)"/i);
    const imageUrl = mediaMatch ? mediaMatch[1] : undefined;
    out.push({ title, url: link, description: desc, publishedAt: pub, imageUrl });
  }
  return out;
}

async function fetchRssFeed(url: string): Promise<ReturnType<typeof parseRss>> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml);
  } catch {
    return [];
  }
}

// ---------- Filtering (domains, junk, freshness) ----------
const BLOCKED_DOMAINS = new Set(
  [
    // PR wires / advertorial-heavy
    "prnewswire.com",
    "businesswire.com",
    "globenewswire.com",
    "newswire.com",
    "investing.com",
    "marketwatch.com",
    "benzinga.com",
    "finance.yahoo.com",
    // low-signal clickbait or coupon/deals
    "dealnews.com",
    "slickdeals.net",
  ].map((d) => d.toLowerCase())
);

const JUNK_PATTERNS: RegExp[] = [
  /\b(sponsored|sponsored content|advertorial)\b/i,
  /\b(promo|deal|discount|sale|coupon|giveaway|sweepstake)\b/i,
  /\bbetting|odds|sportsbook|casino\b/i,
  /\bhoroscope\b/i,
];

function isRecent(iso?: string | Date, hours = 72): boolean {
  const d = iso ? new Date(iso) : new Date(0);
  return Date.now() - d.getTime() <= hours * 3600_000;
}

function looksJunk(title?: string, description?: string): boolean {
  const s = `${title || ""} ${description || ""}`;
  return JUNK_PATTERNS.some((rx) => rx.test(s));
}

// ---------- Lens scoring (trusted outlets + Black-news boost) ----------
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
  title: string,
  body: string,
  domain: string,
  lens: "top" | "black"
): { score: number; blackHits: number } {
  let score = 0;
  if (domain && TRUSTED_DOMAINS.has(domain)) score += 3; // trust boost

  // Boost for Black-focused publishers (higher when lens === "black")
  const blackBoostBase = Number(process.env.NEWS_BLACK_DOMAIN_BOOST || 2);
  if (domain && BLACK_PUBLISHER_DOMAINS.has(domain)) {
    score += (lens === "black" ? blackBoostBase * 2 : blackBoostBase);
  }

  if (/\b(breaking|live|update|exclusive)\b/i.test(title)) score += 1; // newsiness
  if (/\b(opinion|op\-ed|editorial)\b/i.test(title)) score -= 2; // de-emphasize opinion

  const blackHits = countMatches(BLACK_PATTERNS, title, body);
  if (lens === "black" && blackHits) score += Math.min(blackHits, 3) * 2; // cap boost

  const len = body.trim().length;
  if (len > 400) score += 1;
  if (len > 1200) score += 1;

  return { score, blackHits };
}

// ---------- Types saved to Mongo ----------
export interface StoryDoc {
  title: string;
  url: string;
  summary: {
    oneLiner: string;
    bullets: string[]; // exactly 4 strings, each ≤ 120 chars
  };
  publishedAt: Date;
  createdAt: Date;
  imageUrl?: string;
  source: string; // domain (e.g., bbc.co.uk)
  sources: Array<{ title: string; url: string; domain: string }>;
}

// ---------- Core fetcher ----------

/**
 * Fetch from NewsData first; if it fails or returns nothing, fall back to GNews.
 * Then summarize + store new stories.
 */
export async function fetchNewsFromSource(): Promise<{ inserted: number; stories: StoryDoc[] }> {
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB_NAME ?? process.env.mongodb_db_name ?? "kofa";
  const db = client.db(dbName);
  const storiesCol = db.collection<StoryDoc>("stories");

  const seen = new Set<string>();
  const candidates: Array<{
    title: string;
    url: string;
    description: string;
    publishedAt?: string;
    imageUrl?: string;
  }> = [];

  // 1) Primary: NewsData.io
  try {
    const nd = await fetchNewsData({
      q: process.env.NEWS_QUERY || undefined,
      lang: "en",
      from: undefined,
      to: undefined,
    });
    for (const a of nd) {
      const art = a as unknown as { title?: string; url?: string; description?: string; content?: string; snippet?: string; summary?: string; publishedAt?: string; imageUrl?: string };
      const url = normalizeUrl(art.url);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      candidates.push({
        title: art.title ?? "Untitled",
        url,
        description: art.description ?? art.content ?? art.snippet ?? art.summary ?? "",
        publishedAt: art.publishedAt,
        imageUrl: art.imageUrl,
      });
    }
  } catch {
    // fall through to GNews
  }

  // 2) Fallback: GNews (only if primary yielded nothing)
  if (candidates.length === 0) {
    try {
      const g = await fetchGNews({
        q: process.env.NEWS_QUERY || undefined,
        lang: "en",
      });
      for (const a of g) {
        const art = a as unknown as { title?: string; url?: string; description?: string; content?: string; snippet?: string; summary?: string; publishedAt?: string; imageUrl?: string };
        const url = normalizeUrl(art.url);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        candidates.push({
          title: art.title ?? "Untitled",
          url,
          description: art.description ?? art.content ?? art.snippet ?? art.summary ?? "",
          publishedAt: art.publishedAt,
          imageUrl: art.imageUrl,
        });
      }
    } catch {
      // still nothing—return gracefully
    }
  }

  // 3) Fallback: RSS feeds (FEED_URLS or built-in defaults)
  if (candidates.length === 0) {
    const feedsEnv = (process.env.FEED_URLS || "").split(",").map(s => s.trim()).filter(Boolean);
    const defaultFeeds = [
      "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
      "https://feeds.bbci.co.uk/news/rss.xml",
      "https://www.npr.org/sections/news/rss.xml",
    ];
    const feeds = feedsEnv.length ? feedsEnv : defaultFeeds;
    const rssResults: typeof candidates = [];
    for (const f of feeds.slice(0, 5)) { // safety bound
      const items = await fetchRssFeed(f);
      for (const it of items) {
        const url = normalizeUrl(it.url);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        rssResults.push({
          title: it.title ?? "Untitled",
          url,
          description: it.description ?? "",
          publishedAt: it.publishedAt,
          imageUrl: it.imageUrl,
        });
      }
      if (rssResults.length > 60) break; // cap
    }
    if (rssResults.length) {
      candidates.push(...rssResults);
    }
  }

  if (candidates.length === 0) {
    return { inserted: 0, stories: [] };
  }

  // Filter out junk/PR domains, sponsored/ads, and stale items (older than 72h)
  const filteredCandidates = candidates.filter((c) => {
    const domain = getDomain(c.url).toLowerCase();
    if (!c.url || !domain) return false;
    if (BLOCKED_DOMAINS.has(domain)) return false;
    if (looksJunk(c.title, c.description)) return false;
    // If publishedAt present, enforce freshness; if missing, allow
    return !c.publishedAt || isRecent(c.publishedAt, 72);
  });

  if (filteredCandidates.length === 0) {
    return { inserted: 0, stories: [] };
  }

  // Lens tuning to match API route (env-driven)
  const lensEnv = (process.env.NEWS_LENS || "top").toLowerCase();
  const lens: "top" | "black" = lensEnv === "black" ? "black" : "top";
  const minScoreEnv = Number(process.env.NEWS_MIN_SCORE || "");
  const minScore = Number.isFinite(minScoreEnv) ? minScoreEnv : undefined;
  const allowlistOnly = process.env.NEWS_ALLOWLIST_ONLY === "1";

  let scored = filteredCandidates.map((c) => {
    const domain = getDomain(c.url).toLowerCase();
    const { score, blackHits } = scoreStoryForLens(c.title || "", c.description || "", domain, lens);
    return { ...c, __score: score, __blackHits: blackHits, __domain: domain } as typeof c & {
      __score: number; __blackHits: number; __domain: string;
    };
  });

  if (lens === "black") {
    scored = scored.filter((c) => c.__blackHits > 0);
  }
  if (typeof minScore === "number") {
    scored = scored.filter((c) => c.__score >= minScore);
  }
  if (allowlistOnly) {
    scored = scored.filter((c) => TRUSTED_DOMAINS.has(c.__domain));
  }

  scored.sort((a, b) => b.__score - a.__score);

  // Soft cap to protect token spend
  const MAX_TO_SUMMARIZE = Number(process.env.MAX_TO_SUMMARIZE || 40);
  const worklist = scored.slice(0, Math.max(1, Math.min(200, MAX_TO_SUMMARIZE)));

  // De-dupe against DB and summarize
  const toInsert: StoryDoc[] = [];
  for (const c of worklist) {
    // Skip if already ingested
    const exists = await storiesCol.findOne({ url: c.url });
    if (exists) continue;

    const textToSummarize = `${c.title ?? ""}\n\n${c.description ?? ""}`.trim();

    let s: { oneLiner?: string; bullets?: string[] } = {};
    try {
      s = await summarizeWithPerspective(textToSummarize);
    } catch {
      // Skip items that fail to summarize
      continue;
    }

    const summary = {
      oneLiner: enforceLen(s.oneLiner),
      bullets: (() => {
        const arr = Array.isArray(s.bullets) ? s.bullets : [];
        const four = arr.slice(0, 4).map((b) => enforceLen(b));
        while (four.length < 4) four.push("");
        return four;
      })(),
    };

    const doc: StoryDoc = {
      title: c.title ?? "Untitled",
      url: c.url,
      summary,
      publishedAt: c.publishedAt ? new Date(c.publishedAt) : new Date(),
      createdAt: new Date(),
      imageUrl: c.imageUrl,
      source: getDomain(c.url),
      sources: [
        {
          title: c.title ?? "Source",
          url: c.url,
          domain: getDomain(c.url),
        },
      ],
    };

    toInsert.push(doc);
  }

  let inserted = 0;
  const insertedDocs: StoryDoc[] = [];

  if (toInsert.length) {
    try {
      const res = await storiesCol.insertMany(toInsert, { ordered: false });
      inserted = res.insertedCount || 0;
      insertedDocs.push(...toInsert);
    } catch {
      // If duplicate race conditions occur, try one-by-one
      for (const d of toInsert) {
        try {
          await storiesCol.insertOne(d);
          inserted++;
          insertedDocs.push(d);
        } catch {
          // ignore dupes
        }
      }
    }
  }

  return { inserted, stories: insertedDocs };
}

export default fetchNewsFromSource;