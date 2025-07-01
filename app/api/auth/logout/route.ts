// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server'

export function GET(request: Request) {
  const url = new URL(request.url)
  url.pathname = '/'

  const res = NextResponse.redirect(url)
  // clear the session cookie
  res.cookies.set('session', '', { path: '/', expires: new Date(0) })
  return res
}