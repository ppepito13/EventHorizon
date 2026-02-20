import { getEvents } from '@/lib/data';
import { UserForm } from '../user-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function NewUserPage() {
  const events = await getEvents();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dodaj nowego użytkownika</CardTitle>
        <CardDescription>Wprowadź dane, aby utworzyć nowe konto.</CardDescription>
      </CardHeader>
      <CardContent>
        <UserForm events={events} />
      </CardContent>
    </Card>
  );
}
