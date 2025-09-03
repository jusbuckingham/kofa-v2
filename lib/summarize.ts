// lib/summarize.ts
import OpenAI from "openai";

// Models can be tuned via env without code changes
const SUMMARY_MODEL = process.env.SUMMARY_MODEL || "gpt-4o";
const SUMMARY_FALLBACK_MODEL = process.env.SUMMARY_FALLBACK_MODEL || "gpt-4o-mini";

const SUMMARY_DEBUG =
  process.env.NEWS_DEBUG === "1" ||
  process.env.NEWS_DEBUG === "true" ||
  process.env.SUMMARY_DEBUG === "1" ||
  process.env.SUMMARY_DEBUG === "true";

let _openai: OpenAI | null = null;
function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  if (_openai) return _openai;
  _openai = new OpenAI({ apiKey: key });
  return _openai;
}

// Basic promise timeout utility (ms)
function withTimeout<T>(p: Promise<T>, ms = 45000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`openai: timeout after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

interface SummarizeResponse {
  oneLiner?: string;
  bullets?: unknown; // expect string[] but be liberal in parser
  colorNote?: string; // tolerated in parser but not returned to callers
}

export default async function summarizeWithPerspective(
  text: string
): Promise<{ oneLiner: string; bullets: string[] }> {
  if (!text || !text.trim()) {
    return { oneLiner: "", bullets: ["", "", "", "", ""] };
  }

  const scrub = (s: string) => s.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();

  // Structured 5 bullets (Five Ws), JSON output
  const messages: Array<{ role: "system" | "user"; content: string }> = [
    {
      role: "system",
      content: `Extract a concise news summary as STRICT JSON. Return ONLY:
{
  "oneLiner": string,
  "bullets": string[5]
}

Voice & audience:
- Speak as Kofa, a trusted guide for Black readers.
- Be clear, calm, and useful; respectful and grounded.
- Apply a Black-conscious lens: name systems, policies, and patterns when clearly supported by the text (e.g., policing, housing, healthcare, voting, education, labor, tech bias). Note historical context or disparities when relevant.
- If the story is not about Black communities, keep it neutral—but still surface any clearly stated disparate impacts.

Do NOT:
- Reference articles, outlets, authors, or phrases like “reports say,” “according to,” etc.
- Use hashtags, emojis, or filler (“In summary,” “Overall,” “This article…”).
- Use quotes unless the name itself needs them (avoid scare quotes).
- Address the model (“As an AI…”) or include reasoning.

Format rules:
- "bullets" MUST be exactly 5 strings (Five Ws: who, what, where, when, why/impact). Each stands alone like a tweet.
- Each bullet ≤ 120 characters total; prefer 90–120. Multiple short sentences allowed.
- No labels like “Who/What/When/Why”; just the takeaway lines.
- Write in Kofa’s voice; no attribution language.

Priorities:
- Clarity, dignity, and usefulness first. Avoid deficit framing and stereotypes.
- Prefer concrete outcomes (dollars, dates, policies, vote counts) over vague language.
- If harms or benefits to Black communities are explicit, state them plainly.
- If relevant but implicit context exists, add a short clause naming the system (e.g., “amid long-running redlining fallout”).
`,
    },
    {
      role: "user",
      content: `Summarize this article text:

${scrub(text)}`,
    },
  ];

  // Remove hashtags, emojis (via surrogate-pair sweep), and stray quotes
  function stripNoisyMarks(str: string): string {
    if (!str) return "";
    let out = str;
    // remove hashtags (wordy and trailing)
    out = out.replace(/(^|\s)#[a-z0-9_]+/gi, " ");
    // remove most emoji via surrogate-pair sweep
    out = out.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "");
    // remove common quotes
    out = out.replace(/[“”"‘’']/g, "");
    return out;
  }

  // Remove external attributions so bullets read as Kofa's own briefing
  function deAttribute(str: string): string {
    const s = stripNoisyMarks(str)
      // strip leading quotes/spaces
      .replace(/^[\s"'“”‘’]+/, "")
      // common attribution/openers
      .replace(/^(?:according to|report(?:s)? (?:say|from)|news outlets?|media reports?|sources? say|the (?:article|story|report)|as reported|via)\b[:,]?\s*/i, "")
      // remove "outlet says/claims/notes"
      .replace(/\b(?:says|said|claims?|notes?|reports?)\s*[:,]?\s*$/i, "")
      // collapse multiple spaces
      .replace(/\s+/g, " ");
    return s.trim();
  }

  // Helper to enforce length limits (tweet-friendly, word-safe, normalizes whitespace)
  function enforce(str?: string, max = 120): string {
    if (!str) return "";
    // normalize whitespace
    const clean = deAttribute(str).replace(/\s+/g, " ").trim();
    const cleanSafe = stripNoisyMarks(clean).replace(/\s+/g, " ").trim();
    if (cleanSafe.length <= max) return cleanSafe;
    const slice = cleanSafe.slice(0, max - 1);
    // try to cut on a word boundary
    const cutAt = slice.lastIndexOf(" ");
    let base = cutAt > 40 ? slice.slice(0, cutAt) : slice; // don't over-trim short lines
    // remove trailing punctuation/spaces before adding ellipsis
    // Trim trailing spaces and common ASCII punctuation without requiring the 'u' regex flag
    base = base.replace(/[\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+$/, "").trim();
    return base + "…";
  }

  // Naive sentence splitter, tuned for newsy prose
  function splitSentences(str: string): string[] {
    if (!str) return [];
    // Normalize whitespace and split on period/question/exclamation followed by space/newline
    const cleaned = str.replace(/\s+/g, " ").trim();
    const parts = cleaned
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return parts;
  }

  // Heuristic bullets from the raw text (used when model bullets are empty)
  function heuristicBulletsFromText(src: string, max = 120): string[] {
    const sents = splitSentences(scrub(src));
    const picks: string[] = [];
    for (const s of sents) {
      const line = enforce(stripNoisyMarks(deAttribute(s)), max);
      if (line && line.length > 0 && !picks.includes(line)) {
        picks.push(line);
      }
      if (picks.length >= 5) break;
    }
    while (picks.length < 5) picks.push("");
    return picks.slice(0, 5);
  }

  function normalizeBullets(input: unknown, max = 120): string[] {
    const arr = Array.isArray(input)
      ? input
      : typeof input === "object" && input !== null
      ? Object.values(input as Record<string, unknown>)
      : [];
    const onlyStrings = arr.filter((v): v is string => typeof v === "string");
    const trimmed = onlyStrings
      .map((s) => enforce(stripNoisyMarks(deAttribute(s)), max))
      .filter((s) => s.length > 0);
    // Ensure exactly 5 entries: slice if too long, pad with empty strings if too short
    const five = trimmed.slice(0, 5);
    while (five.length < 5) five.push("");
    return five;
  }

  function parseJsonLoose(raw: string): SummarizeResponse {
    const fenced = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    try {
      return JSON.parse(fenced) as SummarizeResponse;
    } catch {
      const start = fenced.indexOf("{");
      const end = fenced.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        const candidate = fenced.slice(start, end + 1);
        try {
          return JSON.parse(candidate) as SummarizeResponse;
        } catch {
          // fall through
        }
      }
      return { oneLiner: fenced.slice(0, 120), bullets: [] };
    }
  }

  async function completeOnce(model: string, messages: Array<{ role: "system" | "user"; content: string }>) {
    const client = getClient();
    if (!client) throw new Error("openai: missing OPENAI_API_KEY");
    return withTimeout(
      client.chat.completions.create({
        model,
        messages,
        temperature: 0.2,
        top_p: 0.9,
        response_format: { type: "json_object" },
        max_tokens: 320,
      }),
      45000
    );
  }

  let response;
  try {
    response = await completeOnce(SUMMARY_MODEL, messages);
  } catch (e: unknown) {
    if (SUMMARY_DEBUG) console.error("[summarize] primary model error", String(e));
    const msg = (e as { message?: string })?.message || "";
    const status = (e as { status?: number })?.status;
    // quick retry on rate limit, then fall back
    if (status === 429 || /rate limit/i.test(msg)) {
      try {
        response = await completeOnce(SUMMARY_MODEL, messages);
      } catch {
        if (SUMMARY_DEBUG) console.error("[summarize] retry failed on primary; falling back");
        try {
          response = await completeOnce(SUMMARY_FALLBACK_MODEL, messages);
        } catch (err) {
          if (SUMMARY_DEBUG) console.error("[summarize] fallback model error; attempting once", String(err));
          response = await completeOnce(SUMMARY_FALLBACK_MODEL, messages);
        }
      }
    } else {
      // non-rate errors fall back once
      try {
        response = await completeOnce(SUMMARY_FALLBACK_MODEL, messages);
      } catch (err) {
        if (SUMMARY_DEBUG) console.error("[summarize] fallback model error; attempting once", String(err));
        response = await completeOnce(SUMMARY_FALLBACK_MODEL, messages);
      }
    }
  }
  if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
    if (SUMMARY_DEBUG) console.error("[summarize] empty OpenAI response");
    const ol = enforce(scrub(text), 120);
    return { oneLiner: ol, bullets: ["", "", "", "", ""] };
  }
  const raw = response.choices[0].message.content ?? "";
  const parsed = parseJsonLoose(raw);
  const safe: SummarizeResponse = typeof parsed === "object" && parsed !== null ? parsed : {};
  let bullets = normalizeBullets(safe.bullets);
  const hadAny = bullets.some((b) => b && b.length);
  if (!hadAny) {
    if (SUMMARY_DEBUG) {
      console.error("[summarize] empty bullets; raw=", raw?.slice(0, 300));
      try { console.error("[summarize] parsed=", JSON.stringify(safe).slice(0, 300)); } catch {}
    }
    bullets = heuristicBulletsFromText(text, 120);
  } else {
    // top up to 5 using heuristics if the model provided fewer than 5 non-empty items
    const need = 5 - bullets.filter((b) => b && b.length).length;
    if (need > 0) {
      const extras = heuristicBulletsFromText(text, 120).filter((e) => e && !bullets.includes(e));
      for (const e of extras) {
        const idx = bullets.findIndex((b) => !b || b.length === 0);
        if (idx !== -1) bullets[idx] = e;
        else bullets.push(e);
        if (bullets.filter((b) => b && b.length).length >= 5) break;
      }
    }
  }
  // Ensure exactly 5
  bullets = bullets.slice(0, 5);
  while (bullets.length < 5) bullets.push("");

  const ol = enforce(
    safe.oneLiner ? stripNoisyMarks(deAttribute(safe.oneLiner)) : scrub(text),
    120
  );
  return { oneLiner: ol, bullets };
}
