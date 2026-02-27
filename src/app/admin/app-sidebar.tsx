'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft, 
  ChevronRight, 
  TicketPercent
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { NAV_ITEMS, iconMap } from './nav-config';
import type { User as AppUser } from '@/lib/types';

interface AppSidebarProps {
  appUser: AppUser;
}

export function AppSidebar({ appUser }: AppSidebarProps) {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

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
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Admin Panel">
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <TicketPercent className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">Admin Panel</span>
                  <span className="truncate text-xs">EventHorizon</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {accessibleNavItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => toggleSidebar()}
              tooltip={isCollapsed ? 'Expand Menu' : 'Minimize Menu'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span className="group-data-[collapsible=icon]:hidden">Minimize Menu</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}