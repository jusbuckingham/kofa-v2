import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function summarizeWithPerspective(content: string): Promise<string> {
  const prompt = `Summarize the following article from the perspective of a culturally conscious Black American. Highlight relevance to systemic injustice, racial equity, and community impact.\n\n${content}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "user", content: prompt }
    ]
  });

  return response.choices[0]?.message?.content || "";
}