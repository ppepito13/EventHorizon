'use client';

import { EventForm } from '../../event-form';
import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore } from '@/firebase/provider';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const firestore = useFirestore();

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !eventId) {
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    const eventRef = doc(firestore, 'events', eventId);
    
    const unsubscribe = onSnapshot(eventRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          setEvent({ id: snapshot.id, ...snapshot.data() } as Event);
        } else {
          setEvent(null);
        }
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore snapshot error:", err);
        setError("Could not fetch event data. Check security rules and network connection.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, eventId]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

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
