
import { getEvents, getJsonRegistrations } from '@/lib/data';
import { getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { RegistrationsClientPage } from './registrations-client-page';
import { Registration } from '@/lib/types';

export default async function RegistrationsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  // getEvents already handles filtering for organizers
  const userEvents = await getEvents(user);
  
  // Also fetch the legacy registrations from the JSON file
  const jsonRegistrations: Registration[] = await getJsonRegistrations();

  return <RegistrationsClientPage events={userEvents} userRole={user.role} initialJsonRegistrations={jsonRegistrations} />;
}
