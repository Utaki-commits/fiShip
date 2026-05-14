import { auth0 } from '@/lib/auth0'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const authRes = await auth0.middleware(request)
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/auth') || pathname.startsWith('/api')) {
    return authRes
  }

  const session = await auth0.getSession(request)

  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!session && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return authRes
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
