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
        <section className="relative w-full h-[50vh] md:h-[60vh] text-primary-foreground">
          <Image
            src={event.heroImage.src}
            alt={event.name}
            fill
            priority
            className="object-cover"
            data-ai-hint={event.heroImage.hint}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-10">
             <div className="container px-4">
                 <div className="max-w-7xl mx-auto pb-12 md:pb-24">
                    <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-bold">
                        {event.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-primary-foreground/90">
                        <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-accent" />
                        <span>{event.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-accent" />
                        <span>{event.location}</span>
                        </div>
                    </div>
                 </div>
             </div>
          </div>
        </section>

        <section className="relative z-10 -mt-16 md:-mt-20">
          <div className="container px-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
                
                <div className="lg:col-span-3 lg:pt-16">
                  <div className="prose prose-lg max-w-none text-foreground/80">
                    <h2 className="text-3xl font-headline font-bold text-foreground mb-4">About the Event</h2>
                    <p>{event.description}</p>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <Card className="w-full shadow-2xl">
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
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
