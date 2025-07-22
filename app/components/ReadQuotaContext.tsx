"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type QuotaState = {
  remaining: number | null;   // null = unknown
  limit: number | null;
  paywalled: boolean;
};

type QuotaContextValue = QuotaState & {
  updateQuota: (patch: Partial<QuotaState>) => void;
};

const ReadQuotaContext = createContext<QuotaContextValue | undefined>(undefined);

export const ReadQuotaProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<QuotaState>({
    remaining: null,
    limit: null,
    paywalled: false,
  });

  const updateQuota = useCallback((patch: Partial<QuotaState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  return (
    <ReadQuotaContext.Provider value={{ ...state, updateQuota }}>
      {children}
    </ReadQuotaContext.Provider>
  );
};

export const useQuota = () => {
  const ctx = useContext(ReadQuotaContext);
  if (!ctx) throw new Error("useQuota must be used inside ReadQuotaProvider");
  return ctx;
};