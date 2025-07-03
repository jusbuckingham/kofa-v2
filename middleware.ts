// middleware.ts
import { withAuth } from '@kinde-oss/kinde-auth-nextjs/middleware';

export default withAuth({
  domain: process.env.NEXT_PUBLIC_KINDE_DOMAIN,
  loginPage: '/login',
  callbackPath: '/api/auth/callback',
});

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};