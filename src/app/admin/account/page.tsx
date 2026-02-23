import { getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChangePasswordForm } from './change-password-form';

export default async function AccountPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
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
            <ChangePasswordForm userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
