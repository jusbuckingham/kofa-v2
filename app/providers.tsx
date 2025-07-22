"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { ReadQuotaProvider } from "./components/ReadQuotaContext";

interface ProvidersProps {
  children: React.ReactNode;
  session?: Session | null;
}

export default function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <ReadQuotaProvider>{children}</ReadQuotaProvider>
    </SessionProvider>
  );
}