import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin");
  }

  const allowedAdmins = ["jus.buckingham@gmail.com"];
  if (!allowedAdmins.includes(session.user?.email ?? "")) {
    redirect("/");
  }

  return (
    <main className="min-h-screen p-6 bg-white dark:bg-gray-900 text-black dark:text-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        <p>Welcome, {session.user?.email}</p>
      </div>
    </main>
  );
}