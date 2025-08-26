// lib/summarize.ts
import OpenAI from "openai";

// Models can be tuned via env without code changes
const SUMMARY_MODEL = process.env.SUMMARY_MODEL || "gpt-4o";
const SUMMARY_FALLBACK_MODEL = process.env.SUMMARY_FALLBACK_MODEL || "gpt-4o-mini";

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

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY env var");
}
const openai = new OpenAI({ apiKey });

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
- Add Black community framing (history, systems, equity, impact) only if it truly adds clarity.

Do NOT:
- Reference articles, outlets, authors, or “reports say,” “according to,” etc.
- Use hashtags, emojis, or filler (“In summary,” “Overall,” “This article…”).
- Use quotes unless the name itself needs them (avoid scare quotes).
- Address the model (“As an AI…”) or include reasoning.

Format rules:
- "bullets" MUST be exactly 5 strings (Five Ws: who, what, where, when, why). Each stands alone like a tweet.
- Each bullet ≤ 120 characters total; prefer 90–120. Multiple short sentences allowed.
- No labels like “Who/What/When/Why”; just the takeaway lines.
- Each line must read as the source itself (no attribution language).

Priorities:
- Clarity and dignity first. Avoid stereotypes or tokenizing.
- If specific Black context isn’t relevant, keep the point neutral and factual.
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

  async function completeOnce(model: string) {
    return withTimeout(
      openai.chat.completions.create({
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
    response = await completeOnce(SUMMARY_MODEL);
  } catch (e: unknown) {
    const msg = (e as { message?: string })?.message || "";
    const status = (e as { status?: number })?.status;
    // quick retry on rate limit, then fall back
    if (status === 429 || /rate limit/i.test(msg)) {
      try {
        response = await completeOnce(SUMMARY_MODEL);
      } catch {
        response = await completeOnce(SUMMARY_FALLBACK_MODEL);
      }
    } else {
      // non-rate errors fall back once
      response = await completeOnce(SUMMARY_FALLBACK_MODEL);
    }
  }
  const raw = response.choices[0].message.content ?? "";
  const parsed = parseJsonLoose(raw);
  const safe: SummarizeResponse = typeof parsed === "object" && parsed !== null ? parsed : {};
  const bullets = normalizeBullets(safe.bullets);
  while (bullets.length < 5) bullets.push("");
  if (bullets.length > 5) bullets.splice(5);
  return {
    oneLiner: enforce(safe.oneLiner ? stripNoisyMarks(deAttribute(safe.oneLiner)) : undefined),
    bullets,
  };
}
