'use client';

import { redirect, usePathname } from 'next/navigation';
import { TicketPercent } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { UserActions } from './user-actions';
import { MobileNav } from './mobile-nav';
import { NAV_ITEMS, iconMap } from './nav-config';
import { useUser, useAuth } from '@/firebase/provider';
import type { User as AppUser } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from 'firebase/auth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isAppUserLoading, setAppUserLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const loadAppUser = async () => {
      if (isUserLoading) return; // Wait until Firebase auth state is resolved

      if (!user) {
        redirect('/login');
        return;
      }
      
      // At this point, we have a Firebase user.
      // Try to find their profile in our app's database.
      let foundAppUser: AppUser | null = null;
      if (user.email) {
          const allUsers = await import('@/data/users.json').then(m => m.default) as AppUser[];
          foundAppUser = allUsers.find(u => u.email === user.email) || null;
      }

      if (foundAppUser) {
          setAppUser(foundAppUser);
      } else {
          // CRITICAL: Firebase user exists but is not in our users.json.
          // This is an inconsistent state. Log them out to prevent being stuck.
          console.error(`User ${user.email || user.uid} not found in app database. Logging out.`);
          await signOut(auth);
          // The onIdTokenChanged listener in the provider will set the user to null,
          // which will trigger the `!user` redirect on the next render, breaking the loop.
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

  // This check is important. If appUser is null after loading,
  // it means the signOut process has been initiated, and we should wait for the redirect.
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
    <TooltipProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[180px_1fr] lg:grid-cols-[220px_1fr]">
        <aside className="hidden border-r bg-muted/40 md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <TicketPercent className="h-6 w-6 text-primary" />
                <span className="">Admin Panel</span>
              </Link>
            </div>
            <div className="flex-1">
              <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
                {accessibleNavItems.map(({ href, icon, label }) => {
                  const Icon = iconMap[icon];
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-accent hover:text-accent-foreground',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <MobileNav navItems={accessibleNavItems} />
            <div className="w-full flex-1 flex justify-end">
              <UserActions user={appUser} />
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-secondary/40">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
