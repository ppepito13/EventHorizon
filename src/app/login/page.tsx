import { getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import { getUsers } from '@/lib/data';

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect('/admin');
  }
  
  const demoUsers = await getUsers();

  return <LoginForm demoUsers={demoUsers} />;
}
