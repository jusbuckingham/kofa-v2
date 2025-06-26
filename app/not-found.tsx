export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
      <p className="text-lg mb-6">
        Sorry, we couldn’t find the page you were looking for.
      </p>
      <a
        href="/"
        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
      >
        ← Back to Home
      </a>
    </main>
  );
}