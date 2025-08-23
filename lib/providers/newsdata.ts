// NewsData.io docs: https://newsdata.io/
import type { SummaryItem, SourceRef } from "@/types";

const BASE = "https://newsdata.io/api/1/news";

export type ProviderFilters = {
  q?: string;
  lang?: string;     // "en"
  from?: string;     // YYYY-MM-DD
  to?: string;       // YYYY-MM-DD
  page?: number;     // they use "page" token string; we’ll treat number as pass-through
};

function domainFromUrl(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

export async function fetchNewsData(filters: ProviderFilters = {}): Promise<SummaryItem[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    apikey: apiKey,
    q: filters.q || "",
    language: filters.lang || "en",
    from_date: filters.from || "",
    to_date: filters.to || "",
    page: filters.page ? String(filters.page) : "",
    country: "", category: "", // set if you want
    size: "10",
  });

  const res = await fetch(`${BASE}?${params.toString()}`, { next: { revalidate: 300 } });
  if (!res.ok) return [];

  const data = await res.json() as {
    status: string;
    results: Array<{
      title?: string;
      link?: string;
      image_url?: string | null;
      pubDate?: string;
      source_id?: string | null;
      source_url?: string | null;
      description?: string | null;
      content?: string | null;
    }>;
  };

  return (data.results || []).map(a => {
    const url = a.link || "";
    const domain = url ? domainFromUrl(url) : a.source_id || "";
    const sources: SourceRef[] = url ? [{ title: a.title || domain, url, domain }] : [];
    return {
      id: url,
      title: a.title || "Untitled",
      url,
      imageUrl: a.image_url || undefined,
      source: domain,
      publishedAt: a.pubDate || new Date().toISOString(),
      oneLiner: a.description || (a.content ? a.content.slice(0, 140) : ""),
      bullets: [],
      colorNote: "",
      sources,
    };
  });
}