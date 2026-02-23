
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from './src/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getIronSession<SessionData>(request.cookies, sessionOptions);
  const isLoggedIn = !!session.user;

  // If trying to access admin routes and not logged in, redirect to login
  if (pathname.startsWith('/admin') && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If trying to access login page and already logged in, redirect to admin
  if (pathname.startsWith('/login') && isLoggedIn) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

// Matcher for all relevant routes
export const config = {
  matcher: ['/admin/:path*', '/login'],
};
