import Image from 'next/image';
import { getActiveEvent } from '@/lib/data';
import { EventRegistrationForm } from '@/components/event-registration-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export default async function Home() {
  const event = await getActiveEvent();

  if (!event) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <Ticket className="w-24 h-24 text-primary mb-4" />
          <h1 className="font-headline text-4xl md:text-5xl font-bold mb-2">
            No Active Events
          </h1>
          <p className="text-muted-foreground max-w-md">
            There are no events currently scheduled. Please check back later for
            updates on upcoming experiences!
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative w-full h-[50vh] md:h-[60vh]">
          <Image
            src={event.heroImage.src}
            alt={event.name}
            fill
            priority
            className="object-cover"
            data-ai-hint={event.heroImage.hint}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-transparent" />
        </section>

        <section className="container mx-auto px-4 -mt-32 md:-mt-48 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            <div className="lg:col-span-3 space-y-6">
              <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-bold text-primary-foreground">
                {event.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-primary-foreground/80">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent" />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-accent" />
                  <span>{event.location}</span>
                </div>
              </div>
              <div className="prose prose-lg prose-invert max-w-none text-primary-foreground/90">
                <p>{event.description}</p>
              </div>
            </div>

            <div className="lg:col-span-2 lg:pt-4">
              <Card className="w-full max-w-md mx-auto lg:max-w-none shadow-2xl bg-card/80 backdrop-blur-sm border-border/50">
                <CardHeader className="text-center">
                  <CardTitle className="font-headline text-3xl">
                    Register Now
                  </CardTitle>
                  <CardDescription>
                    Secure your spot for this exclusive event.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EventRegistrationForm event={event} />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
