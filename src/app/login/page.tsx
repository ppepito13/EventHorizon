import { getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import users from '@/data/users.json';


export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect('/admin');
  }

  return <LoginForm demoUsers={users} />;
}
