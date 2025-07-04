import { authMiddleware } from '@kinde-oss/kinde-auth-nextjs';
import type { NextRequest } from 'next/server';

export default authMiddleware({
  // where to send unauthenticated users
  loginPage: '/login',
  // your Kinde application settings from env
  domain: process.env.KINDE_DOMAIN!,
  clientId: process.env.KINDE_CLIENT_ID!,
  clientSecret: process.env.KINDE_CLIENT_SECRET!,
  postLoginRedirect: process.env.KINDE_POST_LOGIN_REDIRECT_URL!,
  postLogoutRedirect: process.env.KINDE_POST_LOGOUT_REDIRECT_URL!,
});

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'], // protect these routes
};