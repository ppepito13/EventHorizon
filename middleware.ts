import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware is intentionally disabled to avoid conflicts and simplify the auth flow.
// All authentication logic is now handled by reading a server-side session file.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [], // Empty matcher ensures this middleware does not run.
};
