"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

type QuotaState = {
  remaining: number | null;
  limit: number | null;
  resetAt: Date | null;
  paywalled: boolean;
};

type QuotaContextValue = QuotaState & {
  setQuota: (patch: Partial<QuotaState>) => void;
  openPaywallModal: () => void;
};

const ReadQuotaContext = createContext<QuotaContextValue | undefined>(undefined);

export function ReadQuotaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QuotaState>({
    remaining: null,
    limit: null,
    resetAt: null,
    paywalled: false,
  });

  const setQuota = useCallback((patch: Partial<QuotaState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const openPaywallModal = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-paywall-modal"));
    }
  }, []);

  const value: QuotaContextValue = {
    ...state,
    setQuota,
    openPaywallModal,
  };

  return (
    <ReadQuotaContext.Provider value={value}>
      {children}
    </ReadQuotaContext.Provider>
  );
}

export function useReadQuota() {
  const ctx = useContext(ReadQuotaContext);
  if (!ctx) {
    throw new Error("useReadQuota must be used within a ReadQuotaProvider");
  }
  return ctx;
}

export default ReadQuotaProvider;