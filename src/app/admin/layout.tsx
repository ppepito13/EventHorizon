import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Home, LayoutDashboard, PlusCircle } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen">
        <Sidebar>
          <SidebarHeader className="border-b">
            <Link href="/" className="flex items-center gap-2 font-bold font-headline">
              <Icons.Logo className="h-6 w-6 text-accent" />
              <span>EventHorizon</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin">
                    <LayoutDashboard />
                    Events
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-lg font-semibold md:text-xl font-headline">
                Event Management
              </h1>
            </div>

            <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" asChild>
                <Link href="/">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">View Site</span>
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/admin/events/new">
                  <PlusCircle className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">New Event</span>
                </Link>
              </Button>
            </div>
          </header>
          <main className="p-4 sm:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
