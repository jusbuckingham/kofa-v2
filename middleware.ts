// middleware.ts
import { KindeAuth } from '@kinde-oss/kinde-auth-nextjs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Configure Kinde
const kindeAuth = new KindeAuth({
  domain: process.env.NEXT_PUBLIC_KINDE_DOMAIN!,
  clientId: process.env.NEXT_PUBLIC_KINDE_CLIENT_ID!,
  clientSecret: process.env.KINDE_CLIENT_SECRET!,
  baseUrl:   process.env.NEXT_PUBLIC_KINDE_BASE_URL            || 'http://localhost:3000',
  redirectUri: process.env.NEXT_PUBLIC_KINDE_CALLBACK_URL      || '/api/auth/callback',
  postLogoutRedirectUri: process.env.NEXT_PUBLIC_KINDE_POST_LOGOUT_REDIRECT_URL || '/'
});

// This exports a true Next.js middleware that will protect your dashboard/admin routes.
export default function middleware(req: NextRequest) {
  return kindeAuth.middleware()(req, NextResponse.next());
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*']
};