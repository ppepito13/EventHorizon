'use client';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { useUser } from '@/firebase/provider';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { getAppUserByEmailAction } from '@/app/admin/actions';

export default function EventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: firebaseUser, isUserLoading } = useUser();
  const [appUser, setAppUser] = useState<User | null>(null);

  useEffect(() => {
    const loadAppUser = async () => {
      if (isUserLoading) return; // Wait for auth state

      if (firebaseUser?.email) {
        // Use the reliable server action instead of importing a static JSON file
        const foundUser = await getAppUserByEmailAction(firebaseUser.email);
        setAppUser(foundUser || null);
      } else {
        setAppUser(null);
      }
    };
    
    loadAppUser();
  }, [firebaseUser, isUserLoading]);


  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader user={appUser} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
