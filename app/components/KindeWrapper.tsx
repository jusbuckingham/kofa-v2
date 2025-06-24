"use client";

import { KindeProvider } from "@kinde-oss/kinde-auth-nextjs";

export function KindeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <KindeProvider
      clientId={process.env.KINDE_CLIENT_ID!}
      domain={process.env.KINDE_DOMAIN!}
      redirectUri={process.env.KINDE_REDIRECT_URI!}
      logoutUri={process.env.KINDE_LOGOUT_URI!}
    >
      {children}
    </KindeProvider>
  );
}