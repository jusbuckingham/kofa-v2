// app/api/auth/callback/route.ts
import { handleAuth } from '@kinde-oss/kinde-auth-nextjs/server';

export async function GET(request: Request) {
  return handleAuth(request);
}