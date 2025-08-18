// lib/summarize.ts
import OpenAI from "openai";
import { FiveWs } from "@/types";

interface SummarizeResponse {
  oneLiner?: string;
  bullets?: Partial<FiveWs>;
  colorNote?: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function summarizeWithPerspective(
  text: string
): Promise<{ oneLiner: string; bullets: FiveWs; colorNote: string }> {
  // Structured Five Ws + Black perspective, JSON output
  const messages: Array<{ role: "system" | "user"; content: string }> = [
    {
      role: "system",
      content: `Extract structured news summary.
Return JSON with keys: oneLiner, bullets, colorNote.
bullets must have keys: who, what, where, when, why.
Each bullet <=120 chars. oneLiner <=120 chars.
colorNote is 1-2 sentences from a Black American perspective.`,
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

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.3,
    });
    const raw = response.choices[0].message.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        oneLiner: raw.slice(0, 120),
        bullets: { who: "", what: "", where: "", when: "", why: "" },
        colorNote: "",
      } satisfies SummarizeResponse;
    }
    const safe: SummarizeResponse =
      typeof parsed === "object" && parsed !== null ? (parsed as SummarizeResponse) : {};
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
      });
      const raw = fallback.choices[0].message.content ?? "";
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {
          oneLiner: raw.slice(0, 120),
          bullets: { who: "", what: "", where: "", when: "", why: "" },
          colorNote: "",
        } satisfies SummarizeResponse;
      }
      const safe: SummarizeResponse =
        typeof parsed === "object" && parsed !== null ? (parsed as SummarizeResponse) : {};
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
