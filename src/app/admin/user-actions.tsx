import { Button, buttonVariants } from '@/components/ui/button';
import { Home, LogOut } from 'lucide-react';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';

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
        <a href="/">
          <Home className="h-4 w-4 mr-2" />
          Strona główna
        </a>
      </Button>
      <a
        href="/api/logout"
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Wyloguj
      </a>
    </div>
  );
}
