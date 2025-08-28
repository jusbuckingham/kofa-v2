/**
 * lib/fetchNews.ts
 * Aggregates news from external providers (NewsData → GNews → RSS fallback),
 * summarizes with Kofa's perspective, and stores in MongoDB.
 */

import { getDb } from "@/lib/mongoClient";
import type { UpdateFilter } from "mongodb";
import summarizeWithPerspective from "@/lib/summarize";
import { fetchNewsData } from "@/lib/providers/newsdata";
import { fetchGNews } from "@/lib/providers/gnews";

// ---- Ingestion tuning knobs (env-driven) ----
const NEWS_RELAX = process.env.NEWS_RELAX === "1" || process.env.NEWS_RELAX === "true";
const NEWS_DEBUG = process.env.NEWS_DEBUG === "1" || process.env.NEWS_DEBUG === "true";
const NEWS_MIN_LEN = Number.parseInt(process.env.NEWS_MIN_LEN || "", 10);
const NEWS_MIN_LEN_TRUSTED = Number.parseInt(process.env.NEWS_MIN_LEN_TRUSTED || "", 10);
const NEWS_MAX_TO_SUMMARIZE_ENV = Number.parseInt(process.env.NEWS_MAX_TO_SUMMARIZE || "", 10);

// relaxed defaults if env not set
const MIN_LEN_DEFAULT = Number.isFinite(NEWS_MIN_LEN) ? NEWS_MIN_LEN : 120;
const MIN_LEN_TRUSTED_DEFAULT = Number.isFinite(NEWS_MIN_LEN_TRUSTED) ? NEWS_MIN_LEN_TRUSTED : 80;
const NEWS_MAX_TO_SUMMARIZE = Number.isFinite(NEWS_MAX_TO_SUMMARIZE_ENV) ? NEWS_MAX_TO_SUMMARIZE_ENV : 150;
const NEWS_UPDATE_EXISTING =
  process.env.NEWS_UPDATE_EXISTING === "1" ||
  process.env.NEWS_UPDATE_EXISTING === "true" ||
  process.env.NEWS_UPDATE_EXISTING === undefined; // default on

// RSS fetch headers (some hosts block default fetchers)
const RSS_USER_AGENT = process.env.RSS_USER_AGENT || "KofaBot/1.0 (+https://www.kofa.ai)";
const RSS_ACCEPT = "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8";

async function fetchWithUA(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      "User-Agent": RSS_USER_AGENT,
      Accept: RSS_ACCEPT,
    },
    cache: "no-store",
  });
}

// Hard blocks we always keep (even in relaxed mode): PR wires
const HARD_BLOCKED_DOMAINS = new Set<string>([
  "prnewswire.com",
  "businesswire.com",
  "globenewswire.com",
  "newswire.com",
]);

// URL paths that are almost certainly press/sponsored
const URL_HARD_JUNK: RegExp[] = [
  /\/press(-|_)?release\//i,
  /\/sponsored\//i,
];

function isHardBlocked(domain?: string) {
  return !!domain && HARD_BLOCKED_DOMAINS.has(domain.toLowerCase());
}

function looksJunkRelaxed(title?: string, description?: string): boolean {
  const s = `${title || ""} ${description || ""}`;
  return /(press release|press-release|sponsored)/i.test(s);
}

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

function parseAtom(xml: string): Array<{ title?: string; url?: string; description?: string; publishedAt?: string; imageUrl?: string }> {
  const entries: string[] = xml.split(/<entry\b[\s\S]*?>/i).slice(1).map(chunk => {
    const end = chunk.indexOf("</entry>");
    return end >= 0 ? chunk.slice(0, end) : chunk;
  });
  const out: Array<{ title?: string; url?: string; description?: string; publishedAt?: string; imageUrl?: string }> = [];
  for (const raw of entries) {
    const title = stripCdata(extractTag(raw, "title"));
    const linkMatch = raw.match(/<link[^>]*href="([^"]+)"/i);
    const link = linkMatch ? linkMatch[1] : stripCdata(extractTag(raw, "link"));
    const summary = stripCdata(extractTag(raw, "summary")) || stripCdata(extractTag(raw, "content"));
    const updated = stripCdata(extractTag(raw, "updated")) || stripCdata(extractTag(raw, "published"));
    const mediaMatch = raw.match(/<media:content[^>]*url="([^"]+)"/i);
    const imageUrl = mediaMatch ? mediaMatch[1] : undefined;
    out.push({ title, url: link, description: summary, publishedAt: updated, imageUrl });
  }
  return out;
}

async function fetchRssFeed(url: string): Promise<ReturnType<typeof parseRss>> {
  try {
    if (NEWS_DEBUG) console.log("[fetchNews][rss] GET", url);
    const res = await fetchWithUA(url);
    if (!res.ok) {
      if (NEWS_DEBUG) console.warn("[fetchNews][rss] non-200", url, res.status);
      return [];
    }
    const xml = await res.text();
    if (!xml || xml.length < 40) {
      if (NEWS_DEBUG) console.warn("[fetchNews][rss] empty/short body", url);
      return [];
    }
    const isAtom = /<feed\b/i.test(xml) && /<entry\b/i.test(xml);
    const parsed = isAtom ? parseAtom(xml) : parseRss(xml);
    if (NEWS_DEBUG) console.log("[fetchNews][rss] parsed items", url, parsed.length);
    return parsed;
  } catch (err) {
    if (NEWS_DEBUG) console.error("[fetchNews][rss] error", url, String(err));
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

// URL-based junk hints (sections/paths that are usually ads or PR)
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

function isTrustedOrBlackDomain(domain?: string): boolean {
  if (!domain) return false;
  const d = domain.toLowerCase();
  return TRUSTED_DOMAINS.has(d) || BLACK_PUBLISHER_DOMAINS.has(d);
}

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
    bullets: string[]; // exactly 5 strings (Five Ws), each ≤ 120 chars
  };
  publishedAt: Date;
  createdAt: Date;
  imageUrl?: string;
  source: string; // domain (e.g., bbc.co.uk)
  sources: Array<{ title: string; url: string; domain: string }>;
}

type StoryUpdateSet = {
  title: string;
  url: string;
  imageUrl?: string;
  source: string;
  publishedAt: Date;
  oneLiner: string;
  bullets: string[];
  summary: StoryDoc["summary"];
  sources: StoryDoc["sources"];
  updatedAt: Date;
};

// ---------- Core fetcher ----------

/**
 * Fetch from NewsData first; if it fails or returns nothing, fall back to GNews.
 * Then summarize + store new stories.
 */
export async function fetchNewsFromSource(): Promise<{
  inserted: number;
  stories: StoryDoc[];
  debug: { fetched: number; afterHard: number; afterFilters: number; toSummarize: number; inserted: number; modified: number; matched: number };
}> {
  const db = await getDb();
  const storiesCol = db.collection<StoryDoc>("stories");

  const debug = { fetched: 0, afterHard: 0, afterFilters: 0, toSummarize: 0, inserted: 0, modified: 0, matched: 0 };

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
    const feedsEnv = (process.env.FEED_URLS || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^https?:/i.test(s));
    const defaultFeeds = [
      // Top/General
      "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
      "https://feeds.bbci.co.uk/news/rss.xml",
      "https://www.npr.org/sections/news/rss.xml",
      "https://feeds.reuters.com/reuters/topNews",
      "https://www.theguardian.com/us-news/rss",
      // Black-focused / culture
      "https://thegrio.com/feed/",
      "https://www.theroot.com/rss",
      "https://capitalbnews.org/feed/",
      "https://lasentinel.net/feed",
      "https://www.essence.com/feed/",
    ];
    const feeds = feedsEnv.length ? feedsEnv : defaultFeeds;
    const rssResults: typeof candidates = [];
    for (const f of feeds.slice(0, 20)) { // consider more feeds; rate-limited by per-run caps
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
      if (rssResults.length > 180) break; // allow a bit more before scoring
    }
    if (rssResults.length) {
      candidates.push(...rssResults);
    }
  }

  debug.fetched = candidates.length;
  if (NEWS_DEBUG) console.log("[fetchNews] fetched candidates:", debug.fetched);

  if (candidates.length === 0) {
    if (NEWS_DEBUG) console.log("[fetchNews] counters:", debug);
    return { inserted: 0, stories: [], debug };
  }

  // Stage 1: hard filters only (always enforced)
  const afterHard = candidates.filter((c) => {
    const domain = getDomain(c.url).toLowerCase();
    if (!c.url || !domain) return false;
    if (isHardBlocked(domain)) return false; // PR wires
    if (URL_HARD_JUNK.some((rx) => rx.test(c.url))) return false; // press/sponsored paths
    return true;
  });
  debug.afterHard = afterHard.length;
  if (NEWS_DEBUG) console.log("[fetchNews] after hard filters:", debug.afterHard);

  // Stage 2: relaxed vs strict content/freshness filters
  const filteredCandidates = afterHard.filter((c) => {
    const domain = getDomain(c.url).toLowerCase();
    if (!NEWS_RELAX) {
      if (BLOCKED_DOMAINS.has(domain)) return false;
      if (looksJunk(c.title, c.description)) return false;
      if (URL_JUNK_PATTERNS.some((rx) => rx.test(c.url))) return false;
      return !c.publishedAt || isRecent(c.publishedAt, 120);
    } else {
      // Relaxed: only very light junk screen, allow up to 7 days freshness window
      if (looksJunkRelaxed(c.title, c.description)) return false;
      return !c.publishedAt || isRecent(c.publishedAt, 168);
    }
  });
  debug.afterFilters = filteredCandidates.length;
  if (NEWS_DEBUG) console.log("[fetchNews] after soft filters:", debug.afterFilters);

  if (filteredCandidates.length === 0) {
    if (NEWS_DEBUG) console.log("[fetchNews] counters:", debug);
    return { inserted: 0, stories: [], debug };
  }

  // Lens tuning to match API route (env-driven)
  // Always use TOP lens for ingestion; keep Black-conscious boosts in scoring
  const lens: "top" | "black" = "top";

  const scored = filteredCandidates.map((c) => {
    const domain = getDomain(c.url).toLowerCase();
    const { score, blackHits } = scoreStoryForLens(c.title || "", c.description || "", domain, lens);
    return { ...c, __score: score, __blackHits: blackHits, __domain: domain } as typeof c & {
      __score: number; __blackHits: number; __domain: string;
    };
  });

  scored.sort((a, b) => b.__score - a.__score);

  // Soft cap to protect token spend
  const worklist = scored.slice(0, Math.max(1, Math.min(200, NEWS_MAX_TO_SUMMARIZE)));
  debug.toSummarize = worklist.length;
  if (NEWS_DEBUG) console.log("[fetchNews] to summarize:", debug.toSummarize);

  // De-dupe against DB and summarize
  const processedDocs: StoryDoc[] = [];
  for (const c of worklist) {

    const textToSummarize = `${c.title ?? ""}\n\n${c.description ?? ""}`.trim();
    const compactLen = textToSummarize.replace(/\s+/g, "").length;
    const domain = getDomain(c.url);
    // Lower thresholds, env-driven; in relax mode we allow short bodies (title-only)
    const minLen = isTrustedOrBlackDomain(domain) ? MIN_LEN_TRUSTED_DEFAULT : MIN_LEN_DEFAULT;
    if ((!textToSummarize || compactLen < minLen) && !NEWS_RELAX) {
      continue;
    }

    let s: { oneLiner?: string; bullets?: string[] } = {};
    try {
      s = await summarizeWithPerspective(textToSummarize);
    } catch (err) {
      if (NEWS_DEBUG) console.error('[fetchNews] summarize failed', { url: c.url, title: c.title, err: String(err) });
      if (!NEWS_RELAX) {
        continue; // strict mode: skip
      }
      // relax mode: proceed with title-only summary and empty bullets
      s = { oneLiner: c.title ?? "", bullets: ["", "", "", "", ""] };
    }

    const summary = {
      oneLiner: enforceLen(s.oneLiner),
      bullets: (() => {
        const arr = Array.isArray(s.bullets) ? s.bullets : [];
        const five = arr.slice(0, 5).map((b) => enforceLen(b));
        while (five.length < 5) five.push("");
        return five;
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

    if (NEWS_UPDATE_EXISTING) {
      // NOTE: Some historical docs may carry `id: null` and you have a unique index on `id`.
      // We never set `id` here and we proactively unset it to avoid duplicate key errors.
      const setPayload: StoryUpdateSet = {
        title: doc.title,
        url: doc.url,
        imageUrl: doc.imageUrl,
        source: doc.source,
        publishedAt: doc.publishedAt,
        oneLiner: doc.summary.oneLiner,
        bullets: doc.summary.bullets,
        summary: doc.summary,
        sources: doc.sources,
        updatedAt: new Date(),
      };

      const updateDoc: UpdateFilter<StoryDoc> & {
        $setOnInsert: { createdAt: Date };
        $unset: { id?: "" };
      } = {
        $set: setPayload,
        $setOnInsert: { createdAt: doc.createdAt },
        $unset: { id: "" }, // ensure we remove any lingering `id` field (e.g., null) to satisfy unique index
      };

      const res = await storiesCol.updateOne(
        { url: doc.url },
        updateDoc,
        { upsert: true }
      );
      debug.inserted += res.upsertedCount || 0;
      debug.modified += res.modifiedCount || 0;
      debug.matched += res.matchedCount || 0;
    } else {
      // Insert-only mode (legacy)
      try {
        await storiesCol.insertOne(doc);
        debug.inserted += 1;
      } catch {
        // ignore dupes
      }
    }
    processedDocs.push(doc);
  }

  if (NEWS_DEBUG) console.log("[fetchNews] counters:", debug);
  return { inserted: debug.inserted, stories: processedDocs, debug };
}

export default fetchNewsFromSource;