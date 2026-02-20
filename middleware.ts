import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'event-platform-auth-token';

export function middleware(request: NextRequest) {
  const cookie = request.cookies.get(AUTH_COOKIE_NAME);
  const { pathname } = request.nextUrl;

  // If trying to access login page while logged in, redirect to admin
  if (cookie && pathname === '/login') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // If trying to access admin page while not logged in, redirect to login
  if (!cookie && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
