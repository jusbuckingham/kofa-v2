import NewsList from "./components/NewsList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
      <NewsList />
    </main>
  );
}