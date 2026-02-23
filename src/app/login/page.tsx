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
    console.error("LoginPage caught a critical seeding error:", error);
    // Construct a clear error message for the UI from the raw thrown error.
    seedResult = { 
      success: false, 
      message: `A critical server error occurred during data seeding. This is likely an issue with the server's ability to connect to Google services. Error: ${error.message}` 
    };
  }

  return <LoginForm demoUsers={users} seedResult={seedResult} />;
}
