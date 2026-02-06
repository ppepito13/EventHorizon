import { getEventById } from '@/lib/data';
import { EventForm } from '../../event-form';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';


interface EditEventPageProps {
  params: { id: string };
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const event = await getEventById(params.id);

  if (!event) {
    notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Event</CardTitle>
        <CardDescription>Update the details for "{event.name}".</CardDescription>
      </CardHeader>
      <CardContent>
        <EventForm event={event} />
      </CardContent>
    </Card>
  );
}
