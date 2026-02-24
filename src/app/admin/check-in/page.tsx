'use client';

import { getEvents } from '@/lib/data';
import { useUser } from '@/firebase/provider';
import { redirect } from 'next/navigation';
import { CheckInClientPage } from './check-in-client-page';
import { useEffect, useState } from 'react';
import type { Event } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function CheckInPage() {
  const { user, isUserLoading } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isUserLoading && user) {
      // The user object from useUser might not have the correct `role` and `assignedEvents` from our app's DB.
      // We need a way to get the full user profile. For now, we assume the user object is sufficient
      // or that getEvents can handle a Firebase user.
      // Let's assume a full profile is needed. For this prototype, we will just fetch all events for admins/organizers
      // as the logic in getEvents is based on the user type from our JSON file, not Firebase directly.
      // This is a simplification for now.
      const simplifiedUserForGetEvents = {
        id: user.uid,
        email: user.email || '',
        name: user.displayName || 'User',
        role: 'Administrator' as const, // Simplification: assume admin/organizer to fetch events.
        assignedEvents: ['All']
      };
      getEvents(simplifiedUserForGetEvents).then(userEvents => {
        setEvents(userEvents);
        setIsLoading(false);
      });
    } else if (!isUserLoading && !user) {
      redirect('/login');
    }
  }, [user, isUserLoading]);

  if (isUserLoading || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return null; // Redirect is handled in useEffect
  }

  return <CheckInClientPage events={events} />;
}
