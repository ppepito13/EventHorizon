import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from './lib/session';

export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const session = await getSession();
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

// Match all routes that need session protection or redirection.
export const config = {
  matcher: ['/admin/:path*', '/login'],
};
