import NewsList from "./components/NewsList";
import type { NewsStory } from "./types";

// Add this line:
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const NEWS_LIMIT = 5;

export default async function HomePage() {
  // Fetch top stories server-side
  const newsRes = await fetch(
    `${BASE_URL}/api/news/get?limit=${NEWS_LIMIT}`,
    { cache: "no-store" }
  );
  let initialStories: NewsStory[] = [];
  if (newsRes.ok) {
    const newsJson = (await newsRes.json()) as { data: NewsStory[] };
    initialStories = Array.isArray(newsJson.data) ? newsJson.data : [];
  }

  // Fetch user favorites server-side
  const favRes = await fetch(
    `${BASE_URL}/api/favorites`,
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