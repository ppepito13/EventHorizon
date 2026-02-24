
import { UserForm } from '../../user-form';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getEvents, getUserById } from '@/lib/data';

// This is now a Server Component to ensure fresh data is always fetched.
export default async function EditUserPage({ params }: { params: { id: string } }) {
  const { id } = params;

  // Fetch both user and events data on the server side.
  // This prevents client-side caching issues with imported JSON files
  // and ensures the most up-to-date data is used.
  const user = await getUserById(id);
  const events = await getEvents();

  // If the user doesn't exist in our data source, show a 404 page.
  // This is the correct behavior if the ID in the URL is invalid.
  if (!user) {
    notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit User</CardTitle>
        <CardDescription>Modify user details for "{user.name}".</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Pass the server-fetched data to the client component form. */}
        <UserForm user={user} events={events} />
      </CardContent>
    </Card>
  );
}
