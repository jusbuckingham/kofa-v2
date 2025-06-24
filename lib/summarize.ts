

import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function summarizeWithPerspective(content: string) {
  const prompt = `Summarize the following article from the perspective of a culturally conscious Black American. Highlight relevance to systemic injustice, racial equity, and community impact.\n\n${content}`;

  const completion = await openai.createChatCompletion({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
  });

  return completion.data.choices[0].message?.content.trim();
}