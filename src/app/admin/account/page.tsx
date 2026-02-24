'use client';

import { useUser } from '@/firebase/provider';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { User as AppUser } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useAppSettings } from '@/context/app-settings-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChangePasswordForm } from './change-password-form';
import { DescriptiveThemeSwitcher } from './descriptive-theme-switcher';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function AccountPage() {
  const { user: firebaseUser, isUserLoading: isAuthLoading } = useUser();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showTestDataButtons, setShowTestDataButtons } = useAppSettings();


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
          <DescriptiveThemeSwitcher />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Developer Options</CardTitle>
          <CardDescription>
            Manage visibility of developer-specific options, such as test data generators.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center space-x-2">
                <Switch
                    id="developer-options"
                    checked={showTestDataButtons}
                    onCheckedChange={setShowTestDataButtons}
                />
                <Label htmlFor="developer-options">Enable Developer Options</Label>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
