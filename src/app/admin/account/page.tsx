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
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Ustawienia konta</CardTitle>
          <CardDescription>
            Zarządzaj ustawieniami swojego konta.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <ChangePasswordForm userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
