"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";

const QUOTA_ENDPOINT = "/api/user/read";

// Quota context value: remaining summaries, total limit, subscription flag, and a refresh method
export type QuotaContextValue = {
  remaining: number | null;
  limit: number | null;
  hasActiveSub: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

type QuotaApiResponse = {
  remaining: number | null;
  limit: number | null;
  hasActiveSub: boolean;
};

const ReadQuotaContext = createContext<QuotaContextValue | undefined>(undefined);

// Wrap your app in this provider (e.g. in app/layout.tsx)
export function ReadQuotaProvider({ children }: { children: ReactNode }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [hasActiveSub, setHasActiveSub] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(QUOTA_ENDPOINT, { cache: "no-store" });
      if (res.status === 401) {
        setRemaining(null);
        setLimit(null);
        setHasActiveSub(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch quota");
      const data: QuotaApiResponse = await res.json();
      setRemaining(data.remaining);
      setLimit(data.limit);
      setHasActiveSub(data.hasActiveSub);
    } catch (err: unknown) {
      if (process.env.NODE_ENV === "development") {
        console.error(
          "Error refreshing quota:",
          err instanceof Error ? err.message : err
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    // Initial fetch
    void refresh();
    // Periodic auto-refresh every 60s
    const intervalId = setInterval(() => {
      if (mounted) {
        void refresh();
      }
    }, 60_000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [refresh]);

  return (
    <ReadQuotaContext.Provider
      value={{ remaining, limit, hasActiveSub, loading, refresh }}
    >
      {children}
    </ReadQuotaContext.Provider>
  );
}

// Hook to consume the quota context
export function useQuota() {
  const ctx = useContext(ReadQuotaContext);
  if (!ctx) throw new Error("useQuota must be used within ReadQuotaProvider");
  return ctx;
}