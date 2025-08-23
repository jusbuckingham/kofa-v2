import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Admins can be configured via the ALLOWED_ADMINS env var.
 * Example: ALLOWED_ADMINS="admin1@example.com,admin2@example.com"
 */
const allowedAdminsFromEnv =
  (process.env.ALLOWED_ADMINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Fallback to your existing admin if env var is not set
const FALLBACK_ADMINS = ["jus.buckingham@gmail.com"];
const allowedAdmins = allowedAdminsFromEnv.length > 0 ? allowedAdminsFromEnv : FALLBACK_ADMINS;

export const metadata = {
  title: "Admin Dashboard - Kofa",
  description: "Manage Kofa platform settings and content.",
};

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin");
  }

  const email = session.user?.email ?? "";
  if (!email || !allowedAdmins.includes(email)) {
    redirect("/");
  }

  return (
    <main className="min-h-screen p-6 bg-white dark:bg-gray-900 text-black dark:text-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        <p>Welcome, {email}</p>

        <div className="mt-6 rounded-md border border-gray-200 dark:border-gray-800 p-4">
          <h2 className="font-semibold mb-2">Access</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Allowed admins: {allowedAdmins.join(", ") || "None configured"}
          </p>
        </div>
      </div>
    </main>
  );
}