import Link from "next/link";

export const metadata = {
  title: "Login - Kofa",
  description:
    "Log in to your Kofa account to access your personalized dashboard and subscription details.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Please Log In</h1>
      <Link
        href="/signin"
        aria-label="Log in to your Kofa account"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium"
      >
        Continue with Email
      </Link>
      <p className="mt-4 text-sm text-gray-600 text-center max-w-sm">You&#39;ll receive a magic link to sign in.</p>
    </main>
  );
}