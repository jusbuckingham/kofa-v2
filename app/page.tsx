import { headers } from "next/headers";
import NewsList from "./components/NewsList";
import type { NewsStory } from "./types";

type ApiNewsGet = {
  stories: NewsStory[];
  remaining?: number;
  paywalled?: boolean;
  limit?: number;
};

/**
 * Safely parse JSON from a string, return null on failure.
 */
function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

const NEWS_LIMIT = 5;

export default async function HomePage() {
  const allHeaders = await headers();
  const host = allHeaders.get("host") ?? "";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  // ----- Fetch top stories server-side -----
  const newsRes = await fetch(`${baseUrl}/api/news/get?limit=${NEWS_LIMIT}`, {
    cache: "no-store",
  });

  let initialStories: NewsStory[] = [];

  if (newsRes.ok) {
    const ct = newsRes.headers.get("content-type") || "";
    const raw = await newsRes.text();

    if (ct.includes("application/json")) {
      const parsed = safeJsonParse<ApiNewsGet | NewsStory[]>(raw);
      if (Array.isArray(parsed)) {
        initialStories = parsed;
      } else if (parsed && typeof parsed === "object" && "stories" in parsed) {
        const p = parsed as ApiNewsGet;
        initialStories = Array.isArray(p.stories) ? p.stories : [];
      }
    } else {
      // Got HTML (likely a redirect page). Log and continue with empty list.
      console.error("Unexpected non-JSON response from /api/news/get:", raw.slice(0, 200));
    }
  } else {
    // Non-2xx; leave initialStories empty. Can show paywall client-side if needed.
    console.error("Failed /api/news/get:", newsRes.status, await newsRes.text());
  }

  // ----- Fetch user favorites server-side (best-effort) -----
  // If this endpoint is protected and the user is anon, it may return 401. That's fine.
  let savedIdsArray: Array<string | number> = [];
  try {
    const favRes = await fetch(`${baseUrl}/api/favorites`, { cache: "no-store" });
    if (favRes.ok && favRes.headers.get("content-type")?.includes("application/json")) {
      const rawFav = await favRes.text();
      const favJson = safeJsonParse<{ data: { story: NewsStory }[] }>(rawFav);
      const favArray = Array.isArray(favJson?.data) ? favJson!.data : [];
      savedIdsArray = favArray.map((f) => f.story.id);
    }
  } catch (err) {
    console.error("Failed to load favorites:", err);
  }

  return (
    <main>
      <section id="stories" className="max-w-5xl mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Today&apos;s Top Stories</h2>
        {/* Pass an array (serializable) instead of a Set to the client component */}
        <NewsList initialStories={initialStories} savedIds={savedIdsArray} />
      </section>
    </main>
  );
}