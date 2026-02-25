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
import { useEffect, useMemo } from 'react';

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

  /*
  // This useEffect is temporarily disabled to allow the debug view to render.
  useEffect(() => {
    // If loading is finished and we still have no event, it's a 404.
    if (!isLoading && !event) {
      notFound();
    }
  }, [isLoading, event]);
  */

  // --- DEBUG VIEW ---
  // This view is temporarily active to diagnose the data fetching issue.
  return (
    <section className="bg-secondary/40 py-16 md:py-24">
      <div className="container">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Analiza Danych - Widok Debugowania</CardTitle>
            <CardDescription>
              Poniższe informacje pokazują, co dokładnie aplikacja otrzymuje z bazy danych w czasie rzeczywistym.
            </CardDescription>
          </CardHeader>
          <CardContent className="font-mono text-sm space-y-3">
            <div>
              <p><strong>Parametr z URL (slug):</strong></p>
              <p className="p-2 bg-background rounded-md">{params.slug}</p>
            </div>
            <div>
              <p><strong>Status Zapytania do Bazy:</strong></p>
              <p className="p-2 bg-background rounded-md">{isLoading ? 'Ładowanie...' : 'Zakończono'}</p>
            </div>
            <div>
              <p><strong>Błąd Bazy Danych (jeśli wystąpił):</strong></p>
              <p className="p-2 bg-background rounded-md text-destructive">{error ? error.code : 'Brak błędu'}</p>
            </div>
             <div>
              <p><strong>Liczba Znalezionych Wydarzeń:</strong></p>
              <p className="p-2 bg-background rounded-md">{events ? events.length : 'null'}</p>
            </div>

            {error && (
              <div>
                <p><strong>Szczegóły Błędu:</strong></p>
                <pre className="mt-1 p-2 text-xs bg-background rounded-md whitespace-pre-wrap">
                  {error.message}
                </pre>
                {error.code === 'failed-precondition' && (
                    <div className="mt-2 p-3 border-l-4 border-yellow-500 bg-yellow-100 text-yellow-800 rounded-r-md text-xs">
                        <p className="font-bold">Wskazówka:</p>
                        <p>Błąd 'failed-precondition' najczęściej oznacza brak wymaganego indeksu w bazie danych. Proszę otworzyć konsolę deweloperską przeglądarki (klawisz F12). Firebase powinien tam umieścić bezpośredni link, który pozwoli Panu stworzyć ten indeks jednym kliknięciem.</p>
                    </div>
                )}
              </div>
            )}
             {events && (
              <div>
                <p><strong>Otrzymane Dane (pełny obiekt):</strong></p>
                <pre className="mt-1 p-2 text-xs max-h-96 overflow-auto bg-background rounded-md whitespace-pre-wrap">
                  {JSON.stringify(events, null, 2)}
                </pre>
              </div>
            )}
            {!isLoading && events?.length === 0 && (
                 <div className="mt-4 p-3 border-l-4 border-blue-500 bg-blue-100 text-blue-800 rounded-r-md text-xs">
                    <p className="font-bold">Analiza:</p>
                    <p>Zapytanie do bazy danych zakończyło się pomyślnie, ale nie zwróciło żadnych wyników. Oznacza to, że w kolekcji 'events' nie ma **aktywnego** dokumentu, którego pole 'slug' jest równe "{params.slug}".</p>
                    <p className="mt-2">Proszę sprawdzić w panelu administracyjnym, czy wydarzenie o tym slug-u istnieje i czy ma zaznaczony przełącznik "Active".</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
