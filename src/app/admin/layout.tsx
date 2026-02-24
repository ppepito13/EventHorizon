'use client';

import { redirect, usePathname } from 'next/navigation';
import { TicketPercent } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { UserActions } from './user-actions';
import { MobileNav } from './mobile-nav';
import { NAV_ITEMS, iconMap } from './nav-config';
import { useUser } from '@/firebase/provider';
import { getUserById } from '@/lib/data';
import type { User as AppUser } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isAppUserLoading, setAppUserLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        redirect('/login');
      } else {
        // The user object from Firebase doesn't contain our app-specific roles.
        // We need to fetch the user profile from our database (users.json).
        // This is a workaround because the UID from Firebase Auth might not match the ID in users.json.
        // For this prototype, we'll assume the email is the link.
        const fetchAppUser = async () => {
            if (user.email) {
                // This is a mock since we can't directly query by email without a backend.
                // In a real app, this would be an API call.
                const allUsers = await import('@/data/users.json').then(m => m.default);
                const foundUser = allUsers.find(u => u.email === user.email);
                setAppUser(foundUser || null);
            }
            setAppUserLoading(false);
        }
        fetchAppUser();
      }
    }
  }, [user, isUserLoading]);

  if (isUserLoading || isAppUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !appUser) {
    // This will be caught by the redirect in useEffect, but as a fallback:
    return null;
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
              <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                {accessibleNavItems.map(({ href, icon, label }) => {
                  const Icon = iconMap[icon];
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground ${isActive ? 'bg-accent text-accent-foreground' : ''}`}
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
