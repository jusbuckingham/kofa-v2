// lib/summarize.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function summarizeWithPerspective(
  text: string
): Promise<string> {
  // Construct messages emphasizing Black cultural lens and bullet-point output
  const messages: { role: string; content: string }[] = [
    {
      role: "system",
      content: `Output 3 bullet points, each on its own line starting with "- ". No asterisks or colons. Up to 4 sentences per point covering:
1) Who is involved and where
2) What is happening
3) Impact on Black Americans`,
    },
    {
      role: "user",
      content: `Summarize the following text focusing on Black social movements and community impact:

${text}`,
    },
  ];

  // Use GPT-4 with fallback
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any[],
      temperature: 0.3,
    });

    // Normalize content to string
    return (response.choices[0].message.content ?? "") as string;
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
      return (fallback.choices[0].message.content ?? "") as string;
    }
    throw error;
  }
}
