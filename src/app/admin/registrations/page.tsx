import { getEvents, getRegistrations } from '@/lib/data';
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
  const allRegistrations = await getRegistrations();

  const userEventIds = new Set(userEvents.map(e => e.id));
  const userRegistrations = allRegistrations.filter(r => userEventIds.has(r.eventId));

  return <RegistrationsClientPage events={userEvents} registrations={userRegistrations} userRole={user.role} />;
}
