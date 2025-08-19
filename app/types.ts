export interface NewsStory {
  id: string;
  title: string;
  url?: string;
  summary?: string;
  description?: string;
  source?: string;
  category?: string;
  imageUrl?: string;
  publishedAt?: string;
}

export type FiveWs = {
  who?: string;
  what?: string;
  where?: string;
  when?: string;
  why?: string;
};

export type SourceRef = {
  title: string;
  url: string;
  domain: string;
};

export interface SummaryItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  oneLiner: string;
  bullets: FiveWs;
  colorNote: string;
  sources: SourceRef[];
  locked?: boolean; // for free vs. pro gating
}