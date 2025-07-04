// app/components/KindeWrapper.tsx
'use client';

import React from 'react';
import { KindeProvider } from '@kinde-oss/kinde-auth-nextjs';

interface KindeWrapperProps {
  children: React.ReactNode;
}

export default function KindeWrapper({ children }: KindeWrapperProps) {
  return (
    <KindeProvider
      clientId={process.env.NEXT_PUBLIC_KINDE_CLIENT_ID!}
      domain={process.env.NEXT_PUBLIC_KINDE_DOMAIN!}
      redirectUri={process.env.NEXT_PUBLIC_KINDE_POST_LOGIN_REDIRECT_URL!}
      logoutUri={process.env.NEXT_PUBLIC_KINDE_POST_LOGOUT_REDIRECT_URL!}
    >
      {children}
    </KindeProvider>
  );
}