'use client';

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
        // Always fetch the user's role from the server to get the latest data
        const appUser = await getAppUserByEmailAction(user.email);
        
        // If user doesn't exist in our DB or is not an Admin, redirect
        if (!appUser || appUser.role !== 'Administrator') {
          redirect('/admin');
        } else {
          // User is an admin, allow access
          setIsLoading(false);
        }
      } else {
        // A user without an email cannot be an admin in our system
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
