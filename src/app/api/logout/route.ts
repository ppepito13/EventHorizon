import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  // Destroy the session
  const session = await getSession();
  session.destroy();

  // Create a response object to redirect the user to the login page.
  const response = NextResponse.redirect(new URL('/login', request.url));

  return response;
}
