import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import { getUsers } from '@/lib/data';
import { getSession } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function LoginPage() {
  const session = await getSession();
  if (session.user) {
    redirect('/admin');
  }
  
  const demoUsers = await getUsers();
  const sessionData = JSON.stringify(session, null, 2);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-secondary p-4">
      <LoginForm demoUsers={demoUsers} />
      <Card className="w-full max-w-sm">
         <CardHeader>
          <CardTitle>Session Debug Information</CardTitle>
          <CardDescription>Current content of the session file.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs p-4 bg-muted rounded-md overflow-x-auto">
            {sessionData}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
