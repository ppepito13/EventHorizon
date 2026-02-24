'use client';

import { UserForm } from '../../user-form';
import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import type { Event, User } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  const firestore = useFirestore();
  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events')) : null, [firestore]);
  const { data: events, isLoading: areEventsLoading } = useCollection<Event>(eventsQuery);

  useEffect(() => {
    async function loadUser() {
      if (!userId) {
        setIsUserLoading(false);
        return;
      };
      setIsUserLoading(true);
      const allUsers = await import('@/data/users.json').then(m => m.default) as User[];
      const foundUser = allUsers.find(u => u.id === userId);
      setUser(foundUser || null);
      setIsUserLoading(false);
    }
    loadUser();
  }, [userId]);

  const isLoading = isUserLoading || areEventsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    notFound();
  }
  
  const eventsData = events || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit User</CardTitle>
        <CardDescription>Modify user details for "{user.name}".</CardDescription>
      </CardHeader>
      <CardContent>
        <UserForm user={user} events={eventsData} />
      </CardContent>
    </Card>
  );
}
