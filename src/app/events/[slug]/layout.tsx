'use client';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { useUser } from '@/firebase/provider';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';

export default function EventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: firebaseUser, isUserLoading } = useUser();
  const [appUser, setAppUser] = useState<User | null>(null);

  useEffect(() => {
    const loadAppUser = async () => {
      if (firebaseUser?.email) {
        const allUsers = await import('@/data/users.json').then(m => m.default);
        const foundUser = allUsers.find(u => u.email === firebaseUser.email);
        setAppUser(foundUser || null);
      } else {
        setAppUser(null);
      }
    };
    if (!isUserLoading) {
        loadAppUser();
    }
  }, [firebaseUser, isUserLoading]);


  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader user={appUser} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
