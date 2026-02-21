import { getEvents } from '@/lib/data';
import { EventsTable } from './events-table';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }
  
  const events = await getEvents(user);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">
            Manage your events and view their status.
          </p>
        </div>
        {user.role === 'Administrator' && (
          <Button asChild>
            <Link href="/admin/events/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Event
            </Link>
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
          <CardDescription>
            {user.role === 'Administrator' 
              ? "Set an event as active to display it on the homepage."
              : "Below is a list of events you have access to."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventsTable events={events} userRole={user.role} />
        </CardContent>
      </Card>
    </>
  );
}
