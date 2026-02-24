'use client';

import { useUser } from '@/firebase/provider';
import { redirect } from 'next/navigation';
import { CheckInClientPage } from './check-in-client-page';
import { useEffect, useState } from 'react';
import type { Event, User } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function CheckInPage() {
  const { user, isUserLoading } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!isUserLoading && user) {
        const allUsers = await import('@/data/users.json').then(m => m.default) as User[];
        const currentAppUser = allUsers.find(u => u.email === user.email);

        if (currentAppUser) {
            let eventsData = await import('@/data/events.json').then(m => m.default) as Event[];
            if (currentAppUser.role === 'Organizer' && !currentAppUser.assignedEvents.includes('All')) {
                eventsData = eventsData.filter(event => currentAppUser.assignedEvents.includes(event.name));
            }
            setEvents(eventsData);
        }
        
        setIsLoading(false);
      } else if (!isUserLoading && !user) {
        redirect('/login');
      }
    };
    loadData();
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
