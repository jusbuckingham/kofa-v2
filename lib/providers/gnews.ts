// lib/providers/gnews.ts
import type { SummaryItem, SourceRef } from "@/types";

const GNEWS_URL = "https://gnews.io/api/v4/search";

export type ProviderFilters = {
  q?: string;
  lang?: string;        // "en"
  from?: string;        // ISO8601
  to?: string;          // ISO8601
  page?: number;        // 1-based
  sortby?: "publishedAt" | "relevance";
  max?: number;         // 1–10
};

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function fetchGNews(filters: ProviderFilters = {}): Promise<SummaryItem[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams();
  params.set("q", filters.q || "top");
  params.set("lang", filters.lang || "en");
  params.set("page", String(filters.page ?? 1));
  params.set("max", String(Math.min(Math.max(filters.max ?? 10, 1), 10)));
  params.set("token", apiKey);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.sortby) params.set("sortby", filters.sortby);

  const res = await fetch(`${GNEWS_URL}?${params.toString()}`, { next: { revalidate: 300 } });
  if (!res.ok) return [];

  const data = await res.json() as {
    totalArticles: number;
    articles?: Array<{
      title?: string;
      description?: string;
      content?: string;
      url?: string;
      image?: string | null;
      publishedAt?: string;
      source?: { name?: string; url?: string };
    }>;
  };

  const articles = data.articles ?? [];
  const items: SummaryItem[] = [];

  for (const a of articles) {
    if (!a?.url) continue; // must have a URL to key & link
    const domain = domainFromUrl(a.url) || domainFromUrl(a.source?.url || "");
    const sources: SourceRef[] = [{ title: a.title || domain || "Source", url: a.url, domain }];
    items.push({
      id: a.url,
      title: a.title || "Untitled",
      url: a.url,
      imageUrl: a.image || undefined,
      source: domain,
      publishedAt: a.publishedAt || new Date().toISOString(),
      oneLiner: a.description || (a.content ? a.content.slice(0, 140) : ""),
      bullets: [],         // your summarize step will fill these
      colorNote: "",
      sources,
    });
  }

  return items;
}