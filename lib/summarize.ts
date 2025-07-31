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
      content: `You are an expert journalist steeped in Black American history and culture. Provide exactly 3 concise bullet points, each on its own line prefixed with "- ", with no asterisks or colons. Each bullet point may contain no more than 3 sentences and up to 140 characters per bullet point.
1) What is going on
2) What advantages for Black Americans
3) What dis-advantages for Black Americans`,
    },
    {
      role: "user",
      content: `Summarize the following text concisely through the lens of Black social movements and community impact:

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
