
import { getEvents, getUsers } from '@/lib/data';
import { getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { RegistrationsClientPage } from './registrations-client-page';

export default async function RegistrationsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  // getEvents already handles filtering for organizers
  const userEvents = await getEvents(user);
  const demoUsers = await getUsers();
  
  return <RegistrationsClientPage events={userEvents} userRole={user.role} demoUsers={demoUsers} />;
}
