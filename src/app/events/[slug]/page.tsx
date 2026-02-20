import Image from 'next/image';
import { getEventBySlug } from '@/lib/data';
import { notFound } from 'next/navigation';
import { EventRegistrationForm } from '@/components/event-registration-form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Calendar, MapPin } from 'lucide-react';

interface EventPageProps {
  params: {
    slug: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function EventPage({ params }: EventPageProps) {
  const event = await getEventBySlug(params.slug);

  if (!event) {
    notFound();
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
              <span>{event.location}</span>
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
