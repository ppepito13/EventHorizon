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
import { useMemo } from 'react';

export default function EventPage() {
  const params = useParams<{ slug: string }>();
  const firestore = useFirestore();

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

  const event = useMemo(() => (events && events.length > 0 ? events[0] : null), [events]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If loading is finished and there's still no event (or an error occurred), then show 404.
  // This is the safe way to handle it, after the data fetching is complete.
  if (!event || error) {
    notFound();
  }
  
  const formatEventLocation = (location: Event['location']) => {
    if (!location?.types) return null;
    let display = location.types.join(' & ');
    if (location.types.includes('On-site') && location.address) {
      display += ` - ${location.address}`;
    }
    return display;
  };

  return (
    <div className="relative">
      <section className="relative h-[40vh] md:h-[50vh] w-full">
        <Image
          src={event.heroImage.src}
          alt={event.name}
          fill
          priority
          className="object-cover"
          data-ai-hint={event.heroImage.hint}
        />
        <div className="absolute inset-0 bg-black/50" />
      </section>
      
      <div className="container relative -mt-24 md:-mt-32 pb-16 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
            <div className="lg:col-span-2">
                <Card className="bg-card/90 backdrop-blur-sm">
                    <CardHeader>
                        <h1 className="font-headline text-3xl md:text-4xl font-bold">{event.name}</h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground pt-2">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4"/>
                                <span>{event.date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4"/>
                                <span>{formatEventLocation(event.location)}</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="prose dark:prose-invert max-w-none">
                            <p>{event.description}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <div>
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Register Now</CardTitle>
                        <CardDescription>Fill out the form below to secure your spot.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <EventRegistrationForm event={event} />
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
