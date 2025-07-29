import OpenAI, { type APIError } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function summarizeWithPerspective(content: string): Promise<string> {
  // Prepare system+user messages for culturally conscious Black perspective
  const messages = [
    {
      role: 'system',
      content: 'You are an AI assistant that summarizes news articles through the lens of Black social movements and community impact. Provide concise summaries highlighting cultural significance, community implications, and historical context relevant to Black experiences.',
    },
    {
      role: 'user',
      content: `Summarize the following article:\n\n${content}`,
    },
  ] satisfies Parameters<typeof openai.chat.completions.create>[0]['messages'];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
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
        messages,
      });
      return fallback.choices[0]?.message?.content?.trim() || "";
    } catch {
      // On any fallback error (including quota), return raw content
      console.warn("GPT-3.5 fallback error. Returning raw content.");
      return content;
    }
  }
}
// Allow default import for summarization helper
export default summarizeWithPerspective;