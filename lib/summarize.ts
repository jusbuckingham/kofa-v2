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
Rules:
- \`bullets\` MUST be an array with EXACTLY 4 strings.
- Do NOT include labels like "Who:"—just the content of each point.
- Each bullet MUST be \u2264 120 characters.
- \`oneLiner\` MUST be \u2264 120 characters.
- If a culturally-aware Black American perspective fits naturally, weave it in; if not, don’t force it.
`,
    },
    {
      role: "user",
      content: `Summarize this article text:

${text}`,
    },
  ];

  // Helper to enforce length limits
  function enforce(str?: string, max = 120): string {
    if (!str) return "";
    return str.length > max ? str.slice(0, max - 1).trim() + "…" : str;
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
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 300,
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
        temperature: 0.3,
        response_format: { type: "json_object" },
        max_tokens: 300,
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
