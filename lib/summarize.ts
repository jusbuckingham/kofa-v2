// lib/summarize.ts
import OpenAI from "openai";
import { FiveWs } from "@/types";

interface SummarizeResponse {
  oneLiner?: string;
  bullets?: Partial<FiveWs>;
  colorNote?: string;
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY env var");
}
const openai = new OpenAI({ apiKey });

export default async function summarizeWithPerspective(
  text: string
): Promise<{ oneLiner: string; bullets: FiveWs; colorNote: string }> {
  // Structured Five Ws + Black perspective, JSON output
  const messages: Array<{ role: "system" | "user"; content: string }> = [
    {
      role: "system",
      content: `Extract a structured news summary as strict JSON.
Return ONLY a JSON object with keys: oneLiner, bullets, colorNote.
\`bullets\` MUST contain EXACTLY these keys: who, what, where, when, why.
Rules:
- Do NOT include labels like "Who:" in bullet text.
- Each bullet MUST be <= 120 characters.
- \`oneLiner\` MUST be <= 120 characters.
- If a culturally-aware Black American perspective fits naturally, weave it into the bullet phrasing; if not, do not force it.
- \`colorNote\` may be empty. If used, keep it 1–2 sentences.
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

  function parseJsonLoose(raw: string): SummarizeResponse {
    // Strip common markdown code fences
    const fenced = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    try {
      return JSON.parse(fenced) as SummarizeResponse;
    } catch {
      // Attempt to extract the first {...} block
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
      return {
        oneLiner: fenced.slice(0, 120),
        bullets: { who: "", what: "", where: "", when: "", why: "" },
        colorNote: "",
      };
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
    const bullets: FiveWs = {
      who: enforce(safe.bullets?.who),
      what: enforce(safe.bullets?.what),
      where: enforce(safe.bullets?.where),
      when: enforce(safe.bullets?.when),
      why: enforce(safe.bullets?.why),
    };
    return {
      oneLiner: enforce(safe.oneLiner),
      bullets,
      colorNote: safe.colorNote ?? "",
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
      const bullets: FiveWs = {
        who: enforce(safe.bullets?.who),
        what: enforce(safe.bullets?.what),
        where: enforce(safe.bullets?.where),
        when: enforce(safe.bullets?.when),
        why: enforce(safe.bullets?.why),
      };
      return {
        oneLiner: enforce(safe.oneLiner),
        bullets,
        colorNote: safe.colorNote ?? "",
      };
    }
    throw error;
  }
}
