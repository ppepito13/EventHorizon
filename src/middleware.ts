import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware is intentionally disabled to avoid conflicts with the root middleware.ts file.
// All middleware logic is now handled in the project's root directory.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
