import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Paths that should NEVER trigger auth checks (public pages & APIs)
 */
const PUBLIC_PAGE_PATHS = ["/", "/signin", "/pricing"];
const PUBLIC_API_PREFIXES = ["/api/news", "/api/auth", "/api/stripe/webhooks"];

/**
 * Paths that MUST be authenticated
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/api/favorites",
  "/api/user",
  "/api/stripe/checkout",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isApi = pathname.startsWith("/api/");
  const method = req.method;

  // Always allow CORS preflight
  if (method === "OPTIONS") {
    return NextResponse.next();
  }

  // Allow Next.js internals and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/images")
  ) {
    return NextResponse.next();
  }

  // Allow explicitly public pages
  if (PUBLIC_PAGE_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow explicitly public API prefixes
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // If not a protected path, just continue
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Check auth token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // For API routes, return JSON 401 instead of redirecting to HTML signin page
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const signInUrl = new URL("/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

// Only run the middleware on the routes we care about
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/favorites/:path*",
    "/api/user/:path*",
    "/api/stripe/checkout/:path*",
  ],
};