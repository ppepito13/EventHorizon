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
import { useUser } from '@/firebase/provider';
import { useEffect, useState } from 'react';
import type { Event, User } from '@/lib/types';
import { redirect } from 'next/navigation';

export default function AdminDashboardPage() {
  const { user: firebaseUser, isUserLoading: isAuthLoading } = useUser();
  const [appUser, setAppUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthLoading) {
        if (!firebaseUser) {
          redirect('/login');
          return;
        }
        
        const allUsers = await import('@/data/users.json').then(m => m.default) as User[];
        const currentAppUser = allUsers.find(u => u.email === firebaseUser.email);
        
        if (currentAppUser) {
          setAppUser(currentAppUser);
          
          let eventsData = await import('@/data/events.json').then(m => m.default) as Event[];
          if (currentAppUser.role === 'Organizer' && !currentAppUser.assignedEvents.includes('All')) {
            eventsData = eventsData.filter(event => currentAppUser.assignedEvents.includes(event.name));
          }
          setEvents(eventsData);
        }
        setIsLoading(false);
      }
    };
    loadData();
  }, [firebaseUser, isAuthLoading]);

  if (isLoading || isAuthLoading) {
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
          <EventsTable events={events} userRole={appUser.role} />
        </CardContent>
      </Card>
    </>
  );
}
