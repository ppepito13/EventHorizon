import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const cookie = request.cookies.get('session_userid');
  const { pathname } = request.nextUrl;

  // If a logged-in user tries to access the login page, redirect them to the admin dashboard.
  if (cookie && pathname === '/login') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Admin route protection is now primarily handled by the server component layout at
  // src/app/admin/layout.tsx, which is a more robust pattern in the App Router.
  // We've removed the check from here to prevent conflicts during client-side navigation.

  return NextResponse.next();
}

export const config = {
  // We only need the middleware to run on the login page.
  // Admin protection is handled by the layout.
  matcher: ['/login'],
};
