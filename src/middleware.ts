import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // This middleware is intentionally disabled to resolve a critical navigation bug.
  // All guard logic has been moved to Server Component layouts/pages.
  return NextResponse.next();
}

// The matcher is empty, so this middleware will not run on any path.
export const config = {
  matcher: [],
};
