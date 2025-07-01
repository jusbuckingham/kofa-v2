// app/api/auth/login/route.ts
import { NextResponse } from 'next/server'

export function GET(request: Request) {
  const url = new URL(request.url)
  url.pathname = '/dashboard'

  const res = NextResponse.redirect(url)
  // set a simple session cookie
  res.cookies.set('session', '1', { path: '/', httpOnly: true })
  return res
}