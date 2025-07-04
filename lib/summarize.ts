import OpenAI, { type APIError } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function summarizeWithPerspective(content: string): Promise<string> {
  const prompt = `Summarize the following article from the perspective of a culturally conscious Black American. Highlight relevance to systemic injustice, racial equity, and community impact.\n\n${content}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0]?.message?.content?.trim() || "";
  } catch (err: unknown) {
    const apiErr = err as APIError;
    // If we hit quota on GPT-4o, bail out immediately
    if (apiErr.code === "insufficient_quota") {
      console.warn("OpenAI quota exceeded. Skipping summarization.");
      return content;
    }
    console.warn("GPT-4o error, falling back to GPT-3.5-turbo:", err);
    try {
      const fallback = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      });
      return fallback.choices[0]?.message?.content?.trim() || "";
    } catch {
      // On any fallback error (including quota), return raw content
      console.warn("GPT-3.5 fallback error. Returning raw content.");
      return content;
    }
  }
}