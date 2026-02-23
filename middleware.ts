import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from './src/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // This middleware now has a single, focused responsibility:
  // Redirect users who are already logged in away from the login page.
  // The protection for the /admin routes is now handled exclusively by the
  // src/app/admin/layout.tsx file, which has proven to be more reliable.
  if (pathname.startsWith('/login')) {
    const session = await getIronSession<SessionData>(request.cookies, sessionOptions);
    const isLoggedIn = !!session.user;

    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

// Apply middleware ONLY to the login page. The /admin routes are protected
// by the layout file.
export const config = {
  matcher: ['/login'],
};
