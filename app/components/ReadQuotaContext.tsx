"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";

// Quota context value: remaining reads, total limit, subscription flag, and a refresh method
export type QuotaContextValue = {
  remaining: number | null;
  limit: number | null;
  hasActiveSub: boolean;
  refresh: () => Promise<void>;
};

const ReadQuotaContext = createContext<QuotaContextValue | undefined>(undefined);

// Wrap your app in this provider (e.g. in app/layout.tsx)
export function ReadQuotaProvider({ children }: { children: ReactNode }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [hasActiveSub, setHasActiveSub] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/user/read");
      if (res.status === 401) {
        // User not authenticated; set default free reads
        setRemaining(null);
        setLimit(null);
        setHasActiveSub(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch quota");
      const data = (await res.json()) as QuotaContextValue;
      setRemaining(data.remaining);
      setLimit(data.limit);
      setHasActiveSub(data.hasActiveSub);
    } catch (err) {
      console.error("Error refreshing quota:", err);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ReadQuotaContext.Provider
      value={{ remaining, limit, hasActiveSub, refresh }}
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