'use client';

import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import { useUser } from '@/firebase/provider';
import { useEffect } from 'react';
import type { User } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function LoginClientPage({ demoUsers }: { demoUsers: User[] }) {
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && user) {
      redirect('/admin');
    }
  }, [user, isUserLoading]);

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-secondary p-4">
      <LoginForm demoUsers={demoUsers} />
    </div>
  );
}
