'use client';

import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import { useUser } from '@/firebase/provider';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const [demoUsers, setDemoUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!isUserLoading && user) {
      redirect('/admin');
    }
    import('@/data/users.json').then(m => setDemoUsers(m.default as User[]));
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
