
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase/provider';
import { collection, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar, Users, Loader2 } from 'lucide-react';
import type { Event, User as AppUser } from '@/lib/types';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { useState, useEffect } from 'react';

function EventCard({ event }: { event: Event }) {
  return (
    <Card className="overflow-hidden shadow-lg transition-transform duration-300 hover:-translate-y-2 flex flex-col">
      <div className="relative h-48 w-full">
        <Image
          src={event.heroImage.src}
          alt={event.name}
          fill
          className="object-cover"
          data-ai-hint={event.heroImage.hint}
        />
      </div>
      <CardHeader>
        <CardTitle className="font-headline text-xl">{event.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {event.description}
        </p>
        <div className="flex items-center text-sm text-muted-foreground gap-2">
          <Calendar className="w-4 h-4" />
          <span>{event.date}</span>
        </div>
      </CardContent>
      <div className="p-6 pt-0">
        <Button asChild className="w-full" style={{ backgroundColor: event.themeColor }}>
          <Link href={`/events/${event.slug}`}>
            View Details & Register
          </Link>
        </Button>
      </div>
    </Card>
  );
}

export default function Home() {
  const firestore = useFirestore();
  const activeEventsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'events'), where('isActive', '==', true)) : null,
    [firestore]
  );
  const { data: events, isLoading, error } = useCollection<Event>(activeEventsQuery);
  
  const { user: firebaseUser, isUserLoading } = useUser();
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const loadAppUser = async () => {
      if (firebaseUser?.email) {
        const allUsers = await import('@/data/users.json').then(m => m.default);
        const foundUser = allUsers.find(u => u.email === firebaseUser.email);
        setAppUser(foundUser || null);
      } else {
        setAppUser(null);
      }
    };
    if (!isUserLoading) {
        loadAppUser();
    }
  }, [firebaseUser, isUserLoading]);

  const renderEvents = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-red-500 py-16">
          <h3 className="text-2xl font-headline mb-2">Error loading events</h3>
          <p>{error.message}</p>
        </div>
      );
    }
    
    if (!events || events.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-16">
          <h3 className="text-2xl font-headline mb-2">No Active Events</h3>
          <p>There are currently no active events. Please check back later!</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader user={appUser} />
      <main className="flex-1">
        <section
          className="relative flex h-[60vh] flex-col items-center justify-end text-center overflow-hidden bg-cover bg-[center_30%]"
          style={{ backgroundImage: `url('/images/hero-background.png')` }}
        >
          <div className="container relative z-10 flex flex-col items-center pb-20">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base px-8 py-6">
              <Link href="/login">
                <Users className="w-5 h-5 mr-2" />
                Admin Panel
              </Link>
            </Button>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-secondary/20">
          <div className="container">
            <h2 className="text-3xl font-headline font-bold text-center mb-12">
              Active Events
            </h2>
            {renderEvents()}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
