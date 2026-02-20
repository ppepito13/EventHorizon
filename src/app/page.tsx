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
            Zobacz szczegóły i zarejestruj się
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
        <section className="relative bg-primary text-primary-foreground py-20 md:py-32">
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary to-accent opacity-90"
          ></div>
          <div className="container relative z-10 text-center">
            <div className="inline-block bg-white/10 text-xs font-semibold px-4 py-1 rounded-full mb-4">
              <MonitorSmartphone className="w-3 h-3 inline-block mr-2" />
              Platforma rejestracji na wydarzenia
            </div>
            <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-bold max-w-4xl mx-auto">
              System rejestracji wydarzeń
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              Dedykowane strony dla każdego wydarzenia z możliwością pełnego zarządzania
            </p>
            <Button asChild size="lg" className="mt-8 bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base px-8 py-6">
              <Link href="/login">
                <Users className="w-5 h-5 mr-2" />
                Panel administracyjny
              </Link>
            </Button>
          </div>
        </section>

        <div className="relative">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-primary to-transparent -translate-y-full" style={{backgroundColor: 'hsl(var(--primary))'}}></div>
          <svg
              className="absolute -top-0.5 left-0 w-full h-auto text-background"
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
          >
              <path
                  d="M0,120L1440,0L1440,120L0,120Z"
                  className="fill-primary"
              ></path>
              <path
                  d="M0,120 C240,60 480,0 720,0 C960,0 1200,60 1440,120 L1440,120 L0,120Z"
                  className="fill-background"
              ></path>
          </svg>
        </div>


        <section className="py-16 md:py-24">
          <div className="container">
            <h2 className="text-3xl font-headline font-bold text-center mb-12">
              Aktywne wydarzenia
            </h2>
            {events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-16">
                <h3 className="text-2xl font-headline mb-2">Brak aktywnych wydarzeń</h3>
                <p>Obecnie nie ma żadnych aktywnych wydarzeń. Sprawdź ponownie później!</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
