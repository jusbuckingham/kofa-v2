// app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ReadQuotaProvider } from "./components/ReadQuotaContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
      <ReadQuotaProvider>
        {children}
      </ReadQuotaProvider>
    </SessionProvider>
  );
}