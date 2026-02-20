'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Use a directory not watched by the dev server to prevent restarts on file change.
const sessionFilePath = path.join(process.cwd(), '.tmp', 'session.json');

export async function GET(request: NextRequest) {
  // Clear session file by writing an empty object to it.
  try {
    await fs.mkdir(path.dirname(sessionFilePath), { recursive: true });
    await fs.writeFile(sessionFilePath, JSON.stringify({}), 'utf8');
  } catch (error) {
    // If the file doesn't exist, that's fine. If another error occurs, log it.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Failed to clear session file on logout:', error);
    }
  }

  // Create a response object to redirect the user to the login page.
  const response = NextResponse.redirect(new URL('/login', request.url));

  // As a fallback, also instruct the browser to delete any old cookie that might exist.
  response.cookies.set('event-platform-auth-token', '', { maxAge: -1, path: '/' });

  return response;
}
