import NewsList from "./components/NewsList";
import { headers } from "next/headers";
import type { NewsStory } from "./types";

const NEWS_LIMIT = 5;

export default async function HomePage() {
  // Determine absolute base URL
  // Await the headers object before accessing
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  // Fetch top stories server-side
  const newsRes = await fetch(
    `${baseUrl}/api/news/get?limit=${NEWS_LIMIT}`,
    { cache: "no-store" }
  );
  let initialStories: NewsStory[] = [];
  if (newsRes.ok) {
    const json = await newsRes.json();
    initialStories = Array.isArray(json.data) ? json.data : [];
  }

  // Fetch user favorites server-side
  const favRes = await fetch(
    `${baseUrl}/api/favorites`,
    { cache: "no-store" }
  );
  const favJson = favRes.ok ? await favRes.json() : { data: [] };
  const savedIds = new Set<string | number>(
    Array.isArray(favJson.data)
      ? favJson.data.map((f: { story: NewsStory }) => f.story.id)
      : []
  );

  return (
    <main>
      <section id="stories" className="max-w-5xl mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Today&apos;s Top Stories</h2>
        <NewsList initialStories={initialStories} savedIds={savedIds} />
      </section>
    </main>
  );
}