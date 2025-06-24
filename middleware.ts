

import { authMiddleware } from '@kinde-oss/kinde-auth-nextjs/server';

export default authMiddleware();

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'], // Add more protected routes here if needed
};