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
import { Calendar, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase/provider';
import { collection, query, where } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
        <p className="ml-4">Ładowanie danych wydarzenia...</p>
      </div>
    );
  }

  // --- START OF DEBUGGING LOGIC ---
  // If we reach here, isLoading is false. Now we check why we might not have an event.
  if (!event) {
    return (
        <div className="container py-10">
            <Card>
                <CardHeader>
                    <CardTitle className="text-destructive">Błąd Diagnostyczny - 404</CardTitle>
                    <CardDescription>Strona nie została znaleziona. Poniżej znajdują się szczegóły techniczne, które pomogą zdiagnozować problem.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 font-mono text-xs">
                    <p>Próbowano wyświetlić stronę, ale ostatecznie nie znaleziono pasującego wydarzenia. Oto stan aplikacji w momencie podejmowania decyzji:</p>
                    
                    <div className="p-3 bg-muted rounded-md">
                        <strong>Parametry zapytania:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">{`slug: "${params.slug}"\nisActive: true`}</pre>
                    </div>

                    <div className="p-3 bg-muted rounded-md">
                        <strong>Status ładowania (isLoading):</strong>
                        <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(isLoading, null, 2)}</pre>
                        <p className="text-muted-foreground text-xs mt-1">Oczekiwana wartość: false. Jeśli jest 'true', dane wciąż się ładują.</p>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-md">
                        <strong>Obiekt błędu (error):</strong>
                        <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
                        <p className="text-muted-foreground text-xs mt-1">Oczekiwana wartość: null. Jakakolwiek inna wartość wskazuje na problem z uprawnieniami lub połączeniem z bazą danych.</p>
                    </div>

                    <div className="p-3 bg-muted rounded-md">
                        <strong>Otrzymane dane (zmienna 'events'):</strong>
                        <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(events, null, 2)}</pre>
                        <p className="text-muted-foreground text-xs mt-1">Oczekiwana wartość: tablica z jednym obiektem wydarzenia `[ {'{'} ... {'}'} ]`. Wartość `[]` (pusta tablica) oznacza, że zapytanie do bazy danych się powiodło, ale nie znaleziono żadnego wydarzenia pasującego do kryteriów (slug + isActive: true).</p>
                    </div>

                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        **Wniosek:** Jeśli błąd to `null`, a otrzymane dane to `[]` (pusta tablica), oznacza to, że w bazie danych nie ma wydarzenia o podanym 'slug' LUB to wydarzenie ma status `isActive: false`. Proszę zweryfikować dane w panelu administratora.
                      </AlertDescription>
                    </Alert>

                </CardContent>
            </Card>
        </div>
    );
  }
  // --- END OF DEBUGGING LOGIC ---
  
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
