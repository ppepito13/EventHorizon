import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieName = 'session_userid';
  
  // Create a response object to redirect the user
  const response = NextResponse.redirect(new URL('/login', request.url));

  // Instruct the browser to delete the cookie
  response.cookies.set(cookieName, '', { maxAge: -1 });

  return response;
}
