export interface NewsStory {
  id: string;
  title: string;
  url: string;           // now required to align with API shape
  source: string;        // now required
  publishedAt: string;   // now required (ISO string)
  imageUrl?: string;
  summary?: string;      // optional short AI-gen summary (keep for future use)
  description?: string;  // optional longer description
  category?: string;     // optional taxonomy tag
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
  publishedAt: string;   // ISO string
  imageUrl?: string;
  oneLiner: string;
  bullets: string[];
  sources: SourceRef[];
  colorNote?: string;    // made optional since not always present in payload
  locked?: boolean;      // for free vs. pro gating
}