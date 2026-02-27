
'use client';

/**
 * @fileOverview Administrative Guard Layout.
 * This component handles the high-level permission check for the Users management module.
 * 
 * Decision: We perform a server-side role check via `getAppUserByEmailAction` 
 * to ensure that roles stored in the database override any stale client-side tokens.
 */

import { useUser } from '@/firebase/provider';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getAppUserByEmailAction } from '../actions';

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      if (isUserLoading) {
        return; // Wait for Firebase auth to resolve
      }

      if (!user) {
        redirect('/login');
        return;
      }

      if (user.email) {
        // Business Rule: Only users with the 'Administrator' role can access user management.
        const appUser = await getAppUserByEmailAction(user.email);
        
        if (!appUser || appUser.role !== 'Administrator') {
          console.warn("Unauthorized access attempt to user management.");
          redirect('/admin');
        } else {
          setIsLoading(false);
        }
      } else {
        redirect('/admin');
      }
    };

    checkPermissions();
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
