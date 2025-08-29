"use client";

import { useCallback, useMemo, useState } from "react";

// Narrow response types from our admin endpoints
type AdminOk = { ok: true; inserted?: number; deleted?: number; message?: string };
type AdminErr = { ok: false; error: string };

type AdminResponse = AdminOk | AdminErr;

export default function AdminPanel() {
  const [message, setMessage] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");

  const isBusy = status === "running";

  const colorClass = useMemo(() => {
    switch (status) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "running":
        return "text-gray-500";
      default:
        return "text-gray-700";
    }
  }, [status]);

  const callAdmin = useCallback(async (path: "/api/admin/fetch" | "/api/admin/cleanup") => {
    setStatus("running");
    setMessage(path === "/api/admin/fetch" ? "Fetching latest stories…" : "Cleaning up old stories…");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        // Attempt to read structured error, but fall back to status text
        let errText = res.statusText;
        try {
          const data = (await res.json()) as Partial<AdminErr> & { message?: string };
          errText = data?.error || data?.message || errText;
        } catch {
          // ignore JSON parse fail
        }
        throw new Error(errText || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as AdminResponse;
      if (data.ok) {
        const details =
          typeof data.inserted === "number"
            ? `Inserted ${data.inserted}`
            : typeof data.deleted === "number"
            ? `Deleted ${data.deleted}`
            : data.message || "Done.";
        setMessage(details);
        setStatus("success");
      } else {
        setMessage(`Error: ${data.error}`);
        setStatus("error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessage(`Error: ${msg}`);
      setStatus("error");
    }
  }, []);

  return (
    <div className="space-y-4 max-w-md mx-auto p-4 text-center">
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => callAdmin("/api/admin/fetch")}
          disabled={isBusy}
          aria-busy={isBusy}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isBusy ? "Working…" : "Fetch Latest Stories"}
        </button>
        <button
          onClick={() => callAdmin("/api/admin/cleanup")}
          disabled={isBusy}
          aria-busy={isBusy}
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isBusy ? "Working…" : "Cleanup Old Stories"}
        </button>
      </div>

      {message && (
        <p className={`mt-2 ${colorClass}`}>${""}{message}</p>
      )}

      <p className="text-xs text-gray-500">
        Note: These actions require admin permissions and run server tasks. Results are not cached.
      </p>
    </div>
  );
}