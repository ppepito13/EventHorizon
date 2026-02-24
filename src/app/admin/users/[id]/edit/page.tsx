
import { UserForm } from '../../user-form';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getUserById } from '@/lib/data';

// This is a Server Component to ensure fresh data is always fetched.
export default async function EditUserPage({ params }: { params: { id: string } }) {
  const { id } = params;

  // Fetch user data on the server side to ensure freshness.
  const user = await getUserById(id);

  // If the user doesn't exist in our data source, show a 404 page.
  if (!user) {
    notFound();
  }

  // The events data will be fetched on the client-side within UserForm.
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit User</CardTitle>
        <CardDescription>Modify user details for "{user.name}".</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Pass the server-fetched user data to the client component form. */}
        <UserForm user={user} />
      </CardContent>
    </Card>
  );
}
