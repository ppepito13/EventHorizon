import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
  // Destroy the session by clearing the session file
  const session = await getSession();
  await session.destroy();

  // Redirect the user to the login page.
  return redirect('/login');
}
