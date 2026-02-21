import { getEvents } from '@/lib/data';
import { UserForm } from '../user-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function NewUserPage() {
  const events = await getEvents();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New User</CardTitle>
        <CardDescription>Enter the details to create a new account.</CardDescription>
      </CardHeader>
      <CardContent>
        <UserForm events={events} />
      </CardContent>
    </Card>
  );
}
