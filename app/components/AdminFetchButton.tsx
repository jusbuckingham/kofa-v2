// app/components/AdminFetchButton.tsx
"use client";

import { useState } from "react";

export default function AdminFetchButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/fetch", {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}`,
        },
      });
      const data = await res.json();
      if (data.ok) {
        setResult(`✅ Inserted: ${data.inserted}, Total Stories: ${data.storiesCount}`);
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (e) {
      setResult(`❌ Failed: ${String(e)}`);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Fetching..." : "Fetch Latest Stories"}
      </button>
      {result && <div className="text-sm text-gray-700">{result}</div>}
    </div>
  );
}