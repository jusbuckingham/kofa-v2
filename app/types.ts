// app/types.ts
export interface NewsStory {
  id: string | number;
  title: string;
  url: string;
  description?: string;
  // add any other fields your API returns, e.g. source, image, publishedAt…
}