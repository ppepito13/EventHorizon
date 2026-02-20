'use client';

import Link from 'next/link';
import { Menu, TicketPercent } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { NavItem } from './nav-config';
import { iconMap } from './nav-config';

interface MobileNavProps {
    navItems: NavItem[];
}

export function MobileNav({ navItems }: MobileNavProps) {
    return (
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
                    {navItems.map(({ href, icon, label }) => {
                        const Icon = iconMap[icon];
                        return (
                            <Link
                                key={href}
                                href={href}
                                className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-primary"
                            >
                                <Icon className="h-5 w-5" />
                                {label}
                            </Link>
                        );
                    })}
                </nav>
            </SheetContent>
        </Sheet>
    );
}
