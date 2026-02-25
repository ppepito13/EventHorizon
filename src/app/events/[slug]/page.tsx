'use client';

import Image from 'next/image';
import { notFound, useParams } from 'next/navigation';
import { EventRegistrationForm } from '@/components/event-registration-form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Calendar, MapPin, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase/provider';
import { collection, query, where } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { useEffect, useMemo } from 'react';

function formatLocation(location: { types: Array<'Virtual' | 'On-site'>, address?: string }) {
    const typeLabels = location.types.map(t => t === 'Virtual' ? 'Virtual' : 'On-site');
    let locationString = typeLabels.join(' & ');
    if (location.types.includes('On-site') && location.address) {
        locationString += ` - ${location.address}`;
    }
    return locationString;
}

export default function EventPage() {
  const params = useParams<{ slug: string }>();
  const firestore = useFirestore();

  // Query for the specific, active event by its slug.
  // This is more efficient and direct than fetching all active events.
  // NOTE: This may require creating a composite index in Firestore.
  // The browser console will provide a direct link to create it if needed.
  const eventQuery = useMemoFirebase(
    () =>
      firestore && params.slug
        ? query(
            collection(firestore, 'events'),
            where('slug', '==', params.slug),
            where('isActive', '==', true)
          )
        : null,
    [firestore, params.slug]
  );
  
  const { data: events, isLoading, error } = useCollection<Event>(eventQuery);

  // The event is the first (and only) item in the returned array.
  const event = useMemo(() => (events && events.length > 0 ? events[0] : null), [events]);

  useEffect(() => {
    // If loading is finished and we still have no event, it's a 404.
    if (!isLoading && !event) {
      notFound();
    }
  }, [isLoading, event]);
  
  if (isLoading || !event) {
      return (
          <div className="flex h-screen w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="ml-4">Loading event...</p>
          </div>
      );
  }

  if (error) {
    return (
        <div className="flex h-screen w-full items-center justify-center text-red-500">
            <div className="text-center max-w-2xl mx-auto p-4">
              <h3 className="text-2xl font-bold mb-2">Error Loading Event</h3>
              <p className="mb-4 text-foreground/80">Could not fetch event data. This might be due to a permissions issue or a missing database index.</p>
              <pre className="mt-2 text-xs bg-muted p-4 rounded-md font-mono whitespace-pre-wrap text-left text-destructive">
                {error.message}
              </pre>
              <p className="text-xs text-muted-foreground mt-4">If the error message mentions a "missing index", please open your browser's developer console. Firebase provides a direct link there to create the required index in one click.</p>
            </div>
        </div>
    );
  }

  return (
    <>
      <section className="relative h-[40vh] md:h-[50vh]">
        <Image
          src={event.heroImage.src}
          alt={event.name}
          fill
          className="object-cover"
          data-ai-hint={event.heroImage.hint}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
        <div className="container relative z-10 flex h-full flex-col justify-end pb-12 text-white">
          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-bold">
            {event.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>{event.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span>{formatLocation(event.location)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-secondary/40 py-16 md:py-24">
        <div className="container grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-3xl">
                  About the Event
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-lg max-w-none text-foreground/90">
                  <p>{event.description}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card className="shadow-2xl sticky top-24">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">
                  Register Now
                </CardTitle>
                <CardDescription>
                  Join us for this amazing event. It's free!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EventRegistrationForm event={event} />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
