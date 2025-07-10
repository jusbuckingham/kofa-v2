import StoryCard from './components/StoryCard';
import Link from 'next/link';
const NEWS_LIMIT = 5;

interface NewsItem {
  _id?: string;
  title: string;
  summary: string;
  link: string;
}

export default async function HomePage() {
  // Build an absolute URL for the API endpoint
  const apiUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/news/get?limit=${NEWS_LIMIT}`
    : `http://localhost:3000/api/news/get?limit=${NEWS_LIMIT}`;
  const res = await fetch(apiUrl, { cache: 'no-store' });
  let news: NewsItem[] = [];
  if (res.ok) {
    const data = (await res.json()) as NewsItem[] | { data?: NewsItem[] };
    // handle both array or { data: [] } response shapes
    news = Array.isArray(data) ? data : data.data ?? [];
  } else {
    console.error('Fetch error:', res.status, await res.text());
  }

  return (
    <>
      <main className="min-h-screen">
        <section className="w-full bg-gradient-to-r from-yellow-500 via-pink-500 to-red-500 py-20 flex flex-col items-center px-4">
          <h1 className="mt-6 text-5xl font-bold text-white text-center">Kofa AI</h1>
          <p className="mt-4 text-lg text-white text-center max-w-xl">
            Stay informed with AI-powered news summaries delivered through a culturally conscious Black lens.
          </p>
          <a
            href="#sample-stories"
            className="mt-8 inline-block px-8 py-3 bg-white text-black font-semibold rounded-full shadow hover:bg-gray-100 transition"
          >
            Get Started
          </a>
        </section>

        {/* Sample Stories Section */}
        <section
          id="sample-stories"
          className="w-full bg-white py-16"
        >
          <div className="max-w-6xl mx-auto px-4 space-y-8">
            <h2 className="text-3xl font-semibold text-black text-center">
              Today’s Top Stories
            </h2>
            <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {(() => {
                const stories = news.filter(item => item.link);
                return stories.length > 0 ? (
                  stories.map(item => (
                    <Link
                      key={item._id || item.link}
                      href={item.link!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <StoryCard
                        title={item.title}
                        summary={item.summary}
                      />
                    </Link>
                  ))
                ) : (
                  <p className="col-span-full text-center text-gray-500">
                    No stories available.
                  </p>
                );
              })()}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}