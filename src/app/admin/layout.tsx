'use client';

import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';

import { UserActions } from './user-actions';
import { MobileNav } from './mobile-nav';
import { NAV_ITEMS } from './nav-config';
import { useUser, useAuth } from '@/firebase/provider';
import type { User as AppUser } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { getAppUserByEmailAction } from './actions';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isAppUserLoading, setAppUserLoading] = useState(true);

  useEffect(() => {
    const loadAppUser = async () => {
      if (isUserLoading) return; // Wait until Firebase auth state is resolved

      if (!user) {
        redirect('/login');
        return;
      }
      
      // At this point, we have a Firebase user.
      // Use a server action to get fresh profile data.
      let foundAppUser: AppUser | null = null;
      if (user.email) {
          foundAppUser = await getAppUserByEmailAction(user.email);
      }

      if (foundAppUser) {
          setAppUser(foundAppUser);
      } else {
          // CRITICAL: Firebase user exists but is not in our database.
          console.warn(`User ${user.email || user.uid} not found in app database. Logging out.`);
          if (auth) {
            await signOut(auth);
          }
      }
      setAppUserLoading(false);
    };
    
    loadAppUser();
  }, [user, isUserLoading, auth]);

  if (isUserLoading || isAppUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !appUser) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-4">Session invalid, logging out...</p>
        </div>
    );
  }

  const accessibleNavItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly && appUser.role !== 'Administrator') {
      return false;
    }
    if (item.organizerOnly && !['Administrator', 'Organizer'].includes(appUser.role)) {
      return false;
    }
    return true;
  });

  return (
    <SidebarProvider>
      <AppSidebar appUser={appUser} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <div className="md:hidden">
            <MobileNav navItems={accessibleNavItems} />
          </div>
          <div className="hidden md:block">
            <SidebarTrigger className="-ml-1" />
          </div>
          <div className="w-full flex-1 flex justify-end">
            <UserActions user={appUser} />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-secondary/40 overflow-x-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
