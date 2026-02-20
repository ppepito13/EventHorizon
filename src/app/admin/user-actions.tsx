'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, LogOut } from 'lucide-react';
import { logout } from './actions';
import type { User } from '@/lib/types';

interface UserActionsProps {
  user: User;
}

export function UserActions({ user }: UserActionsProps) {

  return (
    <div className="flex items-center gap-4">
       <span className="text-sm text-muted-foreground hidden sm:inline-block">
        Witaj, <span className="font-semibold">{user.name}</span>!
      </span>
      <Button variant="outline" size="sm" asChild>
        <Link href="/">
          <Home className="h-4 w-4 mr-2" />
          Strona główna
        </Link>
      </Button>
      <form action={logout}>
        <Button variant="outline" size="sm" type="submit">
          <LogOut className="h-4 w-4 mr-2" />
          Wyloguj
        </Button>
      </form>
    </div>
  );
}
