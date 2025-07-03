// app/api/auth/[...kindeAuth]/route.ts

import { handleAuth } from '@kinde-oss/kinde-auth-nextjs/server';

export const GET = handleAuth();
export const POST = handleAuth();
