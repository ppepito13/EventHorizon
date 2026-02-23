
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

  let seedResult: SeedResult;
  try {
    // Automatically run the seeding action on page load.
    seedResult = await seedAuthUsersAction();
  } catch (error: any) {
    // The error from the server action is now a standard `Error` object.
    console.error("LoginPage caught a critical seeding error:", error.message);
    // Construct a clear error message for the UI from the thrown error.
    seedResult = { 
      success: false, 
      message: error.message || "A critical server error occurred during data seeding."
    };
  }

  return <LoginForm demoUsers={users} seedResult={seedResult} />;
}
