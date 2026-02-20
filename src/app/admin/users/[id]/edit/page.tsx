import { getEvents, getUserById } from '@/lib/data';
import { UserForm } from '../../user-form';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface EditUserPageProps {
  params: { id: string };
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const user = await getUserById(params.id);
  const events = await getEvents();

  if (!user) {
    notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edytuj użytkownika</CardTitle>
        <CardDescription>Modyfikuj dane użytkownika "{user.name}".</CardDescription>
      </CardHeader>
      <CardContent>
        <UserForm user={user} events={events} />
      </CardContent>
    </Card>
  );
}
