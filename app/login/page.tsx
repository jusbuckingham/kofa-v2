"use client";
import { useRouter } from "next/navigation";

export default function LoginButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push("/signin")}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium"
    >
      Continue with Email
    </button>
  );
}