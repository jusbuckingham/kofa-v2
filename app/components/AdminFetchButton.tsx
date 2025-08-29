// app/components/AdminFetchButton.tsx
"use client";

import { useState } from "react";

export default function AdminFetchButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Narrow unknown JSON to a generic record without using `any`.
  function asRecord(v: unknown): Record<string, unknown> | null {
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
  }

  function hasKey<T extends string>(obj: Record<string, unknown>, key: T): obj is Record<T, unknown> {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  async function handleClick() {
    if (loading) return; // prevent double clicks
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Try to parse JSON, but guard against non-JSON responses
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        // no-op; leave data as null
      }

      const rec = asRecord(data);
      if (!res.ok) {
        const message = rec && hasKey(rec, "error")
          ? String(rec["error"])
          : `${res.status} ${res.statusText}`;
        setResult(`❌ Error: ${message}`);
        return;
      }

      // Success: shape expected from our API { ok, inserted, storiesCount }
      const recOk = rec && typeof rec["ok"] === "boolean" ? (rec["ok"] as boolean) : false;
      if (recOk) {
        const inserted = rec && typeof rec["inserted"] === "number" ? (rec["inserted"] as number) : 0;
        const storiesCount = rec && typeof rec["storiesCount"] === "number" ? (rec["storiesCount"] as number) : 0;
        setResult(`✅ Inserted: ${inserted}, Total Stories: ${storiesCount}`);
      } else {
        const errText = rec && hasKey(rec, "error") ? String(rec["error"]) : "Unknown error";
        setResult(`❌ Error: ${errText}`);
      }
    } catch (e) {
      setResult(`❌ Failed: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              d="M4 12a8 8 0 018-8"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        )}
        {loading ? "Fetching..." : "Fetch Latest Stories"}
      </button>
      {result && (
        <div className="text-sm text-gray-700" role="status" aria-live="polite">
          {result}
        </div>
      )}
    </div>
  );
}