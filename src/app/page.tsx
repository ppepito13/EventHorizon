
import Image from 'next/image';
import Link from 'next/link';
import { getActiveEvents } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar, Users } from 'lucide-react';
import type { Event } from '@/lib/types';
import { SiteFooter } from '@/components/site-footer';

export const dynamic = 'force-dynamic';

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

export default async function Home() {
  const events = await getActiveEvents();

  return (
    <div className="flex flex-col min-h-screen bg-background">
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
            {events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-16">
                <h3 className="text-2xl font-headline mb-2">No Active Events</h3>
                <p>There are currently no active events. Please check back later!</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
