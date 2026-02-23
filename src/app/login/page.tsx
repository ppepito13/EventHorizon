import { getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { LoginForm, type SeedResult } from './login-form';
import users from '@/data/users.json';
import { seedAuthUsersAction } from './actions';

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect('/admin');
  }

  // Automatically run the seeding action on page load.
  const seedResult: SeedResult = await seedAuthUsersAction();

  return <LoginForm demoUsers={users} seedResult={seedResult} />;
}
