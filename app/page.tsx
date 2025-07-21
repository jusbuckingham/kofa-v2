import NewsList from "./components/NewsList";
import type { NewsStory } from "./types";
import { headers } from "next/headers";

const NEWS_LIMIT = 5;

export default async function HomePage() {
  // Determine absolute origin for server-side fetch
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  // Fetch top stories server-side
  const newsRes = await fetch(
    `${baseUrl}/api/news/get?limit=${NEWS_LIMIT}`,
    { cache: "no-store" }
  );
  let initialStories: NewsStory[] = [];
  if (newsRes.ok) {
    const newsJson = (await newsRes.json()) as { data: NewsStory[] };
    initialStories = Array.isArray(newsJson.data) ? newsJson.data : [];
  }

  // Fetch user favorites server-side
  const favRes = await fetch(
    `${baseUrl}/api/favorites`,
    { cache: "no-store" }
  );
  let favArray: { story: NewsStory }[] = [];
  if (favRes.ok) {
    const favJson = (await favRes.json()) as { data: { story: NewsStory }[] };
    favArray = Array.isArray(favJson.data) ? favJson.data : [];
  }
  const savedIds = new Set<string | number>(
    favArray.map((f) => f.story.id)
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