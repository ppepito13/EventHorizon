
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from './src/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // In middleware, we can't use the `cookies()` function from `next/headers`.
  // We have to use the `request.cookies` object.
  const session = await getIronSession<SessionData>(request.cookies, sessionOptions);
  const isLoggedIn = !!session.user;

  // If trying to access any admin route and not logged in, redirect to login page.
  if (pathname.startsWith('/admin') && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If trying to access the login page while already logged in, redirect to the admin dashboard.
  if (pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/admin/:path*', '/login'],
};
