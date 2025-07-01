// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function middleware(req: NextRequest) {
  // Protect /dashboard
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    const session = req.cookies.get('session')
    if (session !== '1') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}