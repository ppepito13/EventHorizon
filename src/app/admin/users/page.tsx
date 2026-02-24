'use client';

import { UsersClientPage } from './users-client-page';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import type { Event, User } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function UsersPage() {
  const firestore = useFirestore();
  const [initialUsers, setInitialUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Fetch events from firestore
  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events')) : null, [firestore]);
  const { data: events, isLoading: areEventsLoading } = useCollection<Event>(eventsQuery);

  // Fetch users from JSON file
  useEffect(() => {
    // This is how client components should fetch static JSON data
    import('@/data/users.json').then(module => {
      setInitialUsers(module.default as User[]);
      setUsersLoading(false);
    });
  }, []);

  const isLoading = areEventsLoading || usersLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <UsersClientPage initialUsers={initialUsers} events={events || []} />
  );
}
