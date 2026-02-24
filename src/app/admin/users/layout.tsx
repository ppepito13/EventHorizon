'use client';

import { useUser } from '@/firebase/provider';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { User as AppUser } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        redirect('/login');
      } else if (user.email) {
        const loadAppUser = async () => {
          const allUsers = await import('@/data/users.json').then(m => m.default) as AppUser[];
          const currentAppUser = allUsers.find(u => u.email === user.email);
          if (currentAppUser?.role !== 'Administrator') {
            redirect('/admin');
          }
          setIsLoading(false);
        };
        loadAppUser();
      } else {
        // No email, cannot determine role
        redirect('/admin');
      }
    }
  }, [user, isUserLoading]);

  if (isUserLoading || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
