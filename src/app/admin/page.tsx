import { getEvents } from '@/lib/data';
import { EventsTable } from './events-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function AdminDashboardPage() {
  const events = await getEvents();

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Events</CardTitle>
        <CardDescription>Manage all your events from one place. Set an event as active to display it on the homepage.</CardDescription>
      </CardHeader>
      <CardContent>
        <EventsTable events={events} />
      </CardContent>
    </Card>
  );
}
