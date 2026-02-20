import Link from 'next/link';
import {
  CalendarDays,
  Menu,
  TicketPercent,
  Users,
  UserCog,
} from 'lucide-react';
import type { Metadata } from 'next';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import AuthGuard from './auth-guard';
import { UserActions } from './user-actions';

export const metadata: Metadata = {
  title: 'Admin Panel',
  description: 'Manage your events and registrations.',
};

const NAV_ITEMS = [
  { href: '/admin', icon: CalendarDays, label: 'Wydarzenia' },
  { href: '/admin/registrations', icon: Users, label: 'Rejestracje' },
  { href: '/admin/users', icon: UserCog, label: 'Użytkownicy' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r bg-muted/40 md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <TicketPercent className="h-6 w-6 text-primary" />
                <span className="">Panel Admina</span>
              </Link>
            </div>
            <div className="flex-1">
              <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </aside>
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col">
                <nav className="grid gap-2 text-lg font-medium">
                  <Link href="/" className="flex items-center gap-2 text-lg font-semibold mb-4">
                    <TicketPercent className="h-6 w-6 text-primary" />
                    <span className="">Panel Admina</span>
                  </Link>
                  {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-primary"
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <div className="w-full flex-1 flex justify-end">
              <UserActions />
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-secondary/40">
            <AuthGuard>{children}</AuthGuard>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
