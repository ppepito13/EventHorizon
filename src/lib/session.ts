import { promises as fs } from 'fs';
import path from 'path';
import type { User } from './types';
import { unstable_noStore as noStore } from 'next/cache';

// Define the shape of the data stored in the session.
export interface SessionData {
  user?: Omit<User, 'password'>;
}

// Path to the session file. Using a file in /tmp or a non-git directory is best
// but for this environment, we'll use the data directory.
const SESSION_FILE_PATH = path.join(process.cwd(), 'data', 'session.json');

// This is our new file-based session implementation.
// It mimics the API of iron-session for compatibility with existing code.
class FileSession {
  private data: SessionData = {};

  constructor(initialData: SessionData = {}) {
    this.data = initialData;
  }

  get user() {
    return this.data.user;
  }

  set user(userData: Omit<User, 'password'> | undefined) {
    this.data.user = userData;
  }

  async save() {
    try {
      await fs.writeFile(SESSION_FILE_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error("Failed to save session file:", error);
      throw new Error("Could not save session.");
    }
  }

  async destroy() {
    this.data = {};
    try {
      // Write an empty object to the file to clear it
      await fs.writeFile(SESSION_FILE_PATH, JSON.stringify({}, null, 2), 'utf8');
    } catch (error) {
      console.error("Failed to destroy session file:", error);
      throw new Error("Could not destroy session.");
    }
  }
}

// This is the key function to get the session in Server Components, Middleware, and Actions.
// It now reads from a file instead of a cookie.
export async function getSession(): Promise<FileSession> {
  noStore(); // Ensure we always read the file, never cache it.
  try {
    const fileContent = await fs.readFile(SESSION_FILE_PATH, 'utf8');
    const data = JSON.parse(fileContent) as SessionData;
    return new FileSession(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // If the file doesn't exist, create it and return an empty session.
      await fs.writeFile(SESSION_FILE_PATH, JSON.stringify({}, null, 2), 'utf8');
      return new FileSession();
    }
    console.error("Failed to read session file:", error);
    // On other errors, return an empty session to prevent crashes.
    return new FileSession();
  }
}


// A helper to get the current user from the session.
export async function getSessionUser(): Promise<Omit<User, 'password'> | null> {
    const session = await getSession();
    return session.user ?? null;
}
