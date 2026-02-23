import Image from 'next/image';
import Link from 'next/link';
import { getActiveEvents } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar, MonitorSmartphone, Users } from 'lucide-react';
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
        {/* BACKUP OF OLD HERO SECTION (2024-07-26) - DO NOT DELETE UNLESS INSTRUCTED
        <section className="relative py-20 md:py-32">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom right, hsl(var(--primary)) 50%, hsl(var(--accent)))'
            }}
          ></div>
          <div className="container relative z-10 text-center text-primary-foreground">
            <div className="inline-block bg-white/10 text-xs font-semibold px-4 py-1 rounded-full mb-4">
              <MonitorSmartphone className="w-3 h-3 inline-block mr-2" />
              Event Registration Platform
            </div>
            <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-bold max-w-4xl mx-auto">
              Event Registration System
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              Dedicated pages for each event with full management capabilities
            </p>
            <Button asChild size="lg" className="mt-8 bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base px-8 py-6">
              <Link href="/login">
                <Users className="w-5 h-5 mr-2" />
                Admin Panel
              </Link>
            </Button>
          </div>
        </section>
        */}

        <section className="relative h-[60vh] min-h-[500px] md:h-[70vh] flex items-center justify-center text-white">
          <Image
            src="https://images.unsplash.com/photo-1620121692029-d088224ddc74?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920"
            alt="Abstract golden wave on a dark blue background"
            fill
            className="object-cover"
            data-ai-hint="gold wave abstract"
            priority
          />
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 text-center px-4">
            <h1 className="font-headline text-5xl sm:text-6xl md:text-7xl font-bold">
              Connect. Code. Celebrate.
            </h1>
            <p className="mt-4 text-xl text-white/80">
              Commerzbank Łódź Event Registration
            </p>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-background">
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
