
import { UserForm } from '../user-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// This component now only needs to render the UserForm,
// which will handle its own data fetching on the client.
export default function NewUserPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New User</CardTitle>
        <CardDescription>Enter the details to create a new account.</CardDescription>
      </CardHeader>
      <CardContent>
        <UserForm />
      </CardContent>
    </Card>
  );
}
