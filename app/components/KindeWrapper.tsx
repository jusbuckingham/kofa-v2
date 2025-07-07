// app/components/KindeWrapper.tsx
'use client';

import React from 'react';
import { KindeProvider } from '@kinde-oss/kinde-auth-nextjs';

interface KindeWrapperProps {
  children: React.ReactNode;
}

export default function KindeWrapper({ children }: KindeWrapperProps) {
  const clientId = process.env.NEXT_PUBLIC_KINDE_CLIENT_ID!;
  const domain = process.env.NEXT_PUBLIC_KINDE_DOMAIN!;
  const redirectUri =
    process.env.NEXT_PUBLIC_KINDE_POST_LOGIN_REDIRECT_URL ||
    (typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '');
  const logoutUri =
    process.env.NEXT_PUBLIC_KINDE_POST_LOGOUT_REDIRECT_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  return (
    <KindeProvider
      clientId={clientId}
      domain={domain}
      redirectUri={redirectUri}
      logoutUri={logoutUri}
    >
      {children}
    </KindeProvider>
  );
}