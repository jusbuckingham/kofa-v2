import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import AdminPanel from "./AdminPanel";

/**
 * Admins can be configured via the ALLOWED_ADMINS env var.
 * Example: ALLOWED_ADMINS="admin1@example.com,admin2@example.com"
 *
 * We normalize emails to lowercase to avoid case-sensitivity issues.
 */
const allowedAdminsFromEnv =
  (process.env.ALLOWED_ADMINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

// Fallback admins can be provided via env as well (comma-separated).
// Defaults to your original admin if not provided.
const FALLBACK_ADMINS =
  (process.env.FALLBACK_ADMINS ?? "jus.buckingham@gmail.com")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const allowedAdmins = allowedAdminsFromEnv.length > 0 ? allowedAdminsFromEnv : FALLBACK_ADMINS;

export const metadata: Metadata = {
  title: "Admin Dashboard - Kofa",
  description: "Manage Kofa platform settings and content.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  // Normalize to lowercase for comparison
  const email = session?.user?.email?.toLowerCase();

  // If not logged in, send to sign-in; if logged in but not allowed, 404
  if (!session) redirect("/api/auth/signin");
  if (!email || !allowedAdmins.includes(email)) notFound();

  return <AdminPanel />;
}