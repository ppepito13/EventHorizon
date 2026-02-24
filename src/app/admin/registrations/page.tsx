'use client';

import { getEvents, getUsers } from '@/lib/data';
import { useUser } from '@/firebase/provider';
import { redirect } from 'next/navigation';
import { RegistrationsClientPage } from './registrations-client-page';
import { useEffect, useState } from 'react';
import type { Event, User } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function RegistrationsPage() {
  const { user: firebaseUser, isUserLoading: isAuthLoading } = useUser();
  const [appUser, setAppUser] = useState<User | null>(null);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthLoading) {
        if (!firebaseUser) {
          redirect('/login');
          return;
        }

        const allUsers = await getUsers();
        setDemoUsers(allUsers);

        const currentAppUser = allUsers.find(u => u.email === firebaseUser.email);
        setAppUser(currentAppUser || null);

        if (currentAppUser) {
          const events = await getEvents(currentAppUser);
          setUserEvents(events);
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
    return <p>Could not load user profile.</p>;
  }

  return <RegistrationsClientPage events={userEvents} userRole={appUser.role} demoUsers={demoUsers} />;
}
