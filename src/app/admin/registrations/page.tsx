
'use client';

import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase/provider';
import { redirect } from 'next/navigation';
import { RegistrationsClientPage } from './registrations-client-page';
import { useEffect, useState, useMemo } from 'react';
import type { Event, User } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { collection, query } from 'firebase/firestore';
import { getAppUserByEmailAction } from '../actions';

export default function RegistrationsPage() {
  const { user: firebaseUser, isUserLoading: isAuthLoading } = useUser();
  const [appUser, setAppUser] = useState<User | null>(null);
  const [isAppUserLoading, setIsAppUserLoading] = useState(true);
  
  const firestore = useFirestore();
  
  // Real-time listener for events from Firestore
  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events')) : null, [firestore]);
  const { data: allEvents, isLoading: areEventsLoading } = useCollection<Event>(eventsQuery);

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthLoading) {
        if (!firebaseUser) {
          redirect('/login');
          return;
        }

        let foundAppUser: User | null = null;
        if (firebaseUser.email) {
            foundAppUser = await getAppUserByEmailAction(firebaseUser.email);
        }
        
        setAppUser(foundAppUser);
        setIsAppUserLoading(false);
      }
    };
    loadData();
  }, [firebaseUser, isAuthLoading]);

  const userEvents = useMemo(() => {
    if (!allEvents || !appUser) return [];
    if (appUser.role === 'Administrator' || (appUser.assignedEvents && appUser.assignedEvents.includes('All'))) {
      return allEvents;
    }
    return allEvents.filter(event => appUser.assignedEvents && appUser.assignedEvents.includes(event.name));
  }, [allEvents, appUser]);

  const isLoading = isAuthLoading || isAppUserLoading || areEventsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!appUser) {
    return <p>Could not load user profile.</p>;
  }

  return <RegistrationsClientPage events={userEvents} userRole={appUser.role} />;
}
