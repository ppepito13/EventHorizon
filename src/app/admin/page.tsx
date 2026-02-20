import Link from 'next/link';
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

export default async function AdminDashboardPage() {
  const events = await getEvents();

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wydarzenia</h1>
          <p className="text-muted-foreground">
            Zarządzaj wydarzeniami i przeglądaj ich status.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/events/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nowe wydarzenie
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Wszystkie wydarzenia</CardTitle>
          <CardDescription>
            Ustaw wydarzenie jako aktywne, aby wyświetlić je na stronie głównej.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventsTable events={events} />
        </CardContent>
      </Card>
    </>
  );
}
