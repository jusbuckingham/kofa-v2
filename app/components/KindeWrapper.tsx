// app/components/KindeWrapper.tsx
'use client';

import React from 'react';
import { KindeProvider } from '@kinde-oss/kinde-auth-nextjs';

interface KindeWrapperProps {
  children: React.ReactNode;
}

export default function KindeWrapper({ children }: KindeWrapperProps) {
  if (!process.env.NEXT_PUBLIC_KINDE_CLIENT_ID || !process.env.NEXT_PUBLIC_KINDE_DOMAIN) {
    throw new Error('Missing Kinde configuration in environment variables');
  }

  return (
    <KindeProvider
      clientId={process.env.NEXT_PUBLIC_KINDE_CLIENT_ID}
      domain={process.env.NEXT_PUBLIC_KINDE_DOMAIN}
      redirectUri={process.env.NEXT_PUBLIC_KINDE_REDIRECT_URI!}
      logoutUri={process.env.NEXT_PUBLIC_KINDE_LOGOUT_URI!}
    >
      {children}
    </KindeProvider>
  );
}
