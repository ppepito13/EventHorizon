import { getEvents } from '@/lib/data';
import { getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { CheckInClientPage } from './check-in-client-page';

export default async function CheckInPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  // getEvents already filters events based on user role
  const events = await getEvents(user);

  return <CheckInClientPage events={events} />;
}
