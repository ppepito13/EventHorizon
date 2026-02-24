'use client';

import { EventForm } from '../../event-form';
import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const firestore = useFirestore();

  const eventRef = useMemoFirebase(
    () => (firestore && eventId ? doc(firestore, 'events', eventId) : null),
    [firestore, eventId]
  );

  const { data: event, isLoading: isDocLoading, error } = useDoc<Event>(eventRef);

  // We are loading if the eventId hasn't been provided by the router yet,
  // or if Firestore is still fetching the document.
  const isLoading = !eventId || isDocLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading event: {error.message}</p>;
  }

  // If loading is finished and there's still no event, it's a genuine 404.
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
