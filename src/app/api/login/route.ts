'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getUserByEmail } from '@/lib/data';
import { sessionOptions, type SessionData } from '@/lib/session';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validatedFields = loginSchema.safeParse(body);

  if (!validatedFields.success) {
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 400 }
    );
  }

  const { email, password } = validatedFields.data;

  try {
    const user = await getUserByEmail(email);

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const session = await getIronSession<SessionData>(cookies(), sessionOptions);
    const { password: _, ...userToStore } = user;
    session.user = userToStore;
    await session.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'A server error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
