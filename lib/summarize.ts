// lib/summarize.ts
import OpenAI from "openai";

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
  // Structured 4 bullets, JSON output
  const messages: Array<{ role: "system" | "user"; content: string }> = [
    {
      role: "system",
      content: `Extract a concise news summary as strict JSON. Return ONLY a JSON object with keys: oneLiner, bullets.
Style:
- Speak as Kofa, a trusted guide for Black readers, delivering clear, conversational "need to know" insights.
- Frame context explicitly from a Black perspective: history, systemic patterns, equity, community impact, and accountability.
- Talk directly and personally to the reader with warmth and clarity.
- Avoid stereotypes or tokenizing; uplift authentic community voices and lived experience.
- Maintain a grounded, respectful tone—no slang, hashtags, or emojis.
Formatting:
- \`bullets\` MUST be an array with EXACTLY 4 strings—each should stand alone and read like a takeaway.
- Bullets may include multiple short sentences (tweet-like); keep the total per bullet ≤ 120 characters.
- No labels like "Who:"—just the content of each point.
- Each bullet MUST be ≤ 120 characters (aim for ~90–120).
Notes:
- If the Black community context is not genuinely relevant, keep the bullet neutral and factual.
- Prioritize clarity, dignity, and usefulness to Black readers.`,
    },
    {
      role: "user",
      content: `Summarize this article text:

${text}`,
    },
  ];

  // Helper to enforce length limits (tweet-friendly, word-safe, normalizes whitespace)
  function enforce(str?: string, max = 120): string {
    if (!str) return "";
    // normalize whitespace
    const clean = str.replace(/\s+/g, " ").trim();
    if (clean.length <= max) return clean;

    const slice = clean.slice(0, max - 1);
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
    const trimmed = onlyStrings.map((s) => enforce(s, max)).filter((s) => s.length > 0);
    // Ensure exactly 4 entries: slice if too long, pad with empty strings if too short
    const four = trimmed.slice(0, 4);
    while (four.length < 4) four.push("");
    return four;
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

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.35,
      response_format: { type: "json_object" },
      max_tokens: 320,
    });
    const raw = response.choices[0].message.content ?? "";
    const parsed = parseJsonLoose(raw);
    const safe: SummarizeResponse = typeof parsed === "object" && parsed !== null ? parsed : {};
    const bullets = normalizeBullets(safe.bullets);
    return {
      oneLiner: enforce(safe.oneLiner),
      bullets,
    };
  } catch (error: unknown) {
    // Check for insufficient_quota on error.cause
    const code = (error as { cause?: { code?: unknown } } | undefined)?.cause?.code;
    if (code === "insufficient_quota") {
      const fallback = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.35,
        response_format: { type: "json_object" },
        max_tokens: 320,
      });
      const raw = fallback.choices[0].message.content ?? "";
      const parsed = parseJsonLoose(raw);
      const safe: SummarizeResponse = typeof parsed === "object" && parsed !== null ? parsed : {};
      const bullets = normalizeBullets(safe.bullets);
      return {
        oneLiner: enforce(safe.oneLiner),
        bullets,
      };
    }
    throw error;
  }
}
