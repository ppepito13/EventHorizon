'use client';

import { UserForm } from '../user-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function NewUserPage() {
  const firestore = useFirestore();
  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events')) : null, [firestore]);
  const { data: events, isLoading: areEventsLoading } = useCollection<Event>(eventsQuery);
  
  if (areEventsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const eventsData = events || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New User</CardTitle>
        <CardDescription>Enter the details to create a new account.</CardDescription>
      </CardHeader>
      <CardContent>
        <UserForm events={eventsData} />
      </CardContent>
    </Card>
  );
}
