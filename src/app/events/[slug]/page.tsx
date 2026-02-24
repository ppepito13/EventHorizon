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

  // Fetch all active events to avoid composite index issues.
  // This query is simple and aligns with security rules.
  const activeEventsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, 'events'),
            where('isActive', '==', true)
          )
        : null,
    [firestore]
  );
  
  const { data: activeEvents, isLoading, error } = useCollection<Event>(activeEventsQuery);

  // Find the specific event from the list on the client-side.
  const event = useMemo(() => {
    if (!activeEvents || !params.slug) return null;
    return activeEvents.find(e => e.slug === params.slug) || null;
  }, [activeEvents, params.slug]);


  useEffect(() => {
    // This prevents a race condition where data loads before params are ready.
    // Only trigger notFound if loading is finished, we have a slug, but no event was found.
    if (!isLoading && params.slug && !event) {
      notFound();
    }
  }, [isLoading, event, params.slug]);
  
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
            <p>Error loading event: {error.message}</p>
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