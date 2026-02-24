'use client';

import { useUser } from '@/firebase/provider';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { User as AppUser } from '@/lib/types';
import { Loader2 } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChangePasswordForm } from './change-password-form';
import { ThemeSwitcher } from './theme-switcher';

export default function AccountPage() {
  const { user: firebaseUser, isUserLoading: isAuthLoading } = useUser();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAppUser = async () => {
      if (!isAuthLoading) {
        if (!firebaseUser) {
          redirect('/login');
          return;
        }

        if (firebaseUser.email) {
            const allUsers = await import('@/data/users.json').then(m => m.default) as AppUser[];
            const currentAppUser = allUsers.find(u => u.email === firebaseUser.email);
            setAppUser(currentAppUser || null);
        }
        setIsLoading(false);
      }
    };
    loadAppUser();
  }, [firebaseUser, isAuthLoading]);

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!appUser) {
    return <p>Could not load user profile data.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Security</CardTitle>
          <CardDescription>
            Manage your account password.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <ChangePasswordForm userId={appUser.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose between light and dark mode.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSwitcher />
        </CardContent>
      </Card>
    </div>
  );
}
