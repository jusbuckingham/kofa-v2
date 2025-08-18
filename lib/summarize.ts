// lib/summarize.ts
import OpenAI from "openai";
import { FiveWs } from "@/app/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function summarizeWithPerspective(
  text: string
): Promise<{ oneLiner: string; bullets: FiveWs; colorNote: string }> {
  // Structured Five Ws + Black perspective, JSON output
  const messages: { role: string; content: string }[] = [
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any[],
      temperature: 0.3,
    });
    const raw = response.choices[0].message.content ?? "";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // fallback: wrap in minimal object
      parsed = {
        oneLiner: raw.slice(0, 120),
        bullets: { who: "", what: "", where: "", when: "", why: "" },
        colorNote: "",
      };
    }
    const bullets: FiveWs = {
      who: enforce(parsed.bullets?.who),
      what: enforce(parsed.bullets?.what),
      where: enforce(parsed.bullets?.where),
      when: enforce(parsed.bullets?.when),
      why: enforce(parsed.bullets?.why),
    };
    return {
      oneLiner: enforce(parsed.oneLiner),
      bullets,
      colorNote: parsed.colorNote ?? "",
    };
  } catch (error: unknown) {
    // Check for insufficient_quota on error.cause
    const err = error as { cause?: { code?: unknown } };
    if (err.cause?.code === "insufficient_quota") {
      const fallback = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: messages as any[],
        temperature: 0.3,
      });
      const raw = fallback.choices[0].message.content ?? "";
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {
          oneLiner: raw.slice(0, 120),
          bullets: { who: "", what: "", where: "", when: "", why: "" },
          colorNote: "",
        };
      }
      const bullets: FiveWs = {
        who: enforce(parsed.bullets?.who),
        what: enforce(parsed.bullets?.what),
        where: enforce(parsed.bullets?.where),
        when: enforce(parsed.bullets?.when),
        why: enforce(parsed.bullets?.why),
      };
      return {
        oneLiner: enforce(parsed.oneLiner),
        bullets,
        colorNote: parsed.colorNote ?? "",
      };
    }
    throw error;
  }
}
