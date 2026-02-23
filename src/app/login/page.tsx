import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import { getUsers } from '@/lib/data';
import { getSession } from '@/lib/session';

export default async function LoginPage() {
  const session = await getSession();
  if (session.user) {
    redirect('/admin');
  }
  
  const demoUsers = await getUsers();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-secondary p-4">
      <LoginForm demoUsers={demoUsers} />
    </div>
  );
}
