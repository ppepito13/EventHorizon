
'use client';

/**
 * @fileOverview Dynamic Public Event Landing Page.
 * This component handles the retrieval and display of event-specific information.
 * 
 * Safety Rule: The query strictly filters by 'isActive == true' to ensure that 
 * unpublished or draft events are never accessible via direct URL manipulation.
 */

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
import { Calendar, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase/provider';
import { collection, query, where } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RichTextRenderer } from '@/components/rich-text-renderer';

export default function EventPage() {
  const params = useParams<{ slug: string }>();
  const firestore = useFirestore();

  /**
   * Memoized query to prevent unnecessary re-fetches during component re-renders.
   * We search by slug (URL segment) rather than ID for SEO and user-friendly URLs.
   */
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

  // Heuristic: Slug uniqueness is currently managed in the Admin UI.
  const event = useMemo(() => (events && events.length > 0 ? events[0] : null), [events]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4">Loading event data...</p>
      </div>
    );
  }

  // Diagnostic feedback for missing or inactive events.
  if (!event) {
    return (
        <div className="container py-10">
            <Card>
                <CardHeader>
                    <CardTitle className="text-destructive">Diagnostic Error - 404</CardTitle>
                    <CardDescription>Page not found. Below are technical details to help diagnose the issue.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 font-mono text-xs">
                    <p>The system could not find a matching event. Current state:</p>
                    
                    <div className="p-3 bg-muted rounded-md">
                        <strong>Query Params:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">{`slug: "${params.slug}"\nisActive: true`}</pre>
                    </div>

                    <div className="p-3 bg-muted rounded-md">
                        <strong>Loading Status:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(isLoading, null, 2)}</pre>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-md">
                        <strong>Error Object:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
                    </div>

                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Conclusion:</strong> If the error is null and data is empty, the event either doesn't exist or is set to `isActive: false` in the Admin Panel.
                      </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
  }
  
  /**
   * Helper to format location metadata based on event format (Virtual/On-site).
   */
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
                        {/* 
                          The description is stored as a Slate.js JSON string.
                          RichTextRenderer handles the safe conversion to React components.
                        */}
                        <RichTextRenderer content={event.description} />
                    </CardContent>
                </Card>
            </div>
            
            <aside>
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Register Now</CardTitle>
                        <CardDescription>Fill out the form below to secure your spot.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <EventRegistrationForm event={event} />
                    </CardContent>
                </Card>
            </aside>
        </div>
      </div>
    </div>
  );
}
