'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Home, LogOut } from 'lucide-react';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/firebase/provider';
import { signOut } from 'firebase/auth';

interface UserActionsProps {
  user: User;
}

export function UserActions({ user }: UserActionsProps) {
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    // After signing out, Firebase's onIdTokenChanged will clear the user state.
    // We then redirect to a public page.
    router.push('/');
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground hidden sm:inline-block">
        Welcome, <span className="font-semibold">{user.name}</span>!
      </span>
      <Button variant="outline" size="sm" asChild>
        <Link href="/">
          <Home className="h-4 w-4 mr-2" />
          Homepage
        </Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Log out
      </Button>
    </div>
  );
}
