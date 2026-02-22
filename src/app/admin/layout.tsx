import { redirect } from 'next/navigation';
import { TicketPercent } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { TooltipProvider } from '@/components/ui/tooltip';
import { UserActions } from './user-actions';
import { MobileNav } from './mobile-nav';
import { NAV_ITEMS, iconMap } from './nav-config';
import { getSessionUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Admin Panel',
  description: 'Manage your events and registrations.',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  // This is the new, authoritative guard for all admin routes.
  // If no user is found, we redirect to the login page.
  if (!user) {
    redirect('/login');
  }
  
  const accessibleNavItems = NAV_ITEMS.filter(item => {
      if (item.adminOnly && user.role !== 'Administrator') {
          return false;
      }
      if (item.organizerOnly && !['Administrator', 'Organizer'].includes(user.role)) {
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
                  return (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
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
              <UserActions user={user} />
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
