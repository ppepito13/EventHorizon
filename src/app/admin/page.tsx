
'use client';

import { EventsTable } from './events-table';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { PlusCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase/provider';
import { useEffect, useState, useMemo } from 'react';
import type { Event, User } from '@/lib/types';
import { redirect } from 'next/navigation';
import { collection, query } from 'firebase/firestore';

export default function AdminDashboardPage() {
  const { user: firebaseUser, isUserLoading: isAuthLoading } = useUser();
  const [appUser, setAppUser] = useState<User | null>(null);
  const [isAppUserLoading, setIsAppUserLoading] = useState(true);
  
  const firestore = useFirestore();

  // Real-time listener for events from Firestore
  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events')) : null, [firestore]);
  const { data: allEvents, isLoading: areEventsLoading } = useCollection<Event>(eventsQuery);

  useEffect(() => {
    const loadAppUser = async () => {
      if (!isAuthLoading) {
        if (!firebaseUser) {
          redirect('/login');
          return;
        }
        
        // This still relies on users.json, which is fine for this scope.
        const allUsers = await import('@/data/users.json').then(m => m.default) as User[];
        const currentAppUser = allUsers.find(u => u.email === firebaseUser.email);
        
        setAppUser(currentAppUser || null);
        setIsAppUserLoading(false);
      }
    };
    loadAppUser();
  }, [firebaseUser, isAuthLoading]);

  const filteredEvents = useMemo(() => {
    if (!allEvents || !appUser) return [];
    if (appUser.role === 'Administrator' || appUser.assignedEvents.includes('All')) {
      return allEvents;
    }
    return allEvents.filter(event => appUser.assignedEvents.includes(event.name));
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
    return <p>User profile not found.</p>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">
            Manage your events and view their status.
          </p>
        </div>
        {appUser.role === 'Administrator' && (
          <Button asChild>
            <Link href="/admin/events/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Event
            </Link>
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
          <CardDescription>
            {appUser.role === 'Administrator'
              ? "Set an event as active to display it on the homepage."
              : "Below is a list of events you have access to."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventsTable events={filteredEvents} userRole={appUser.role} />
        </CardContent>
      </Card>
    </>
  );
}
