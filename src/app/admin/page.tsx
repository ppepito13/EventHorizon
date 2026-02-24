
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase/provider';
import { useEffect, useState, useMemo, useTransition } from 'react';
import type { Event, User } from '@/lib/types';
import { redirect } from 'next/navigation';
import { collection, query, writeBatch, doc, setDoc, getDocs } from 'firebase/firestore';
import { useAppSettings } from '@/context/app-settings-provider';
import { getAppUserByEmailAction } from './actions';

const FAKE_EVENT_THEMES = [
    { name: 'Quantum Leap Conference', slug: 'quantum-leap-conference', color: '#8b5cf6', hint: 'futuristic technology' },
    { name: 'Sustainable Futures Summit', slug: 'sustainable-futures-summit', color: '#22c55e', hint: 'green technology' },
    { name: 'AI & Beyond Expo', slug: 'ai-beyond-expo', color: '#3b82f6', hint: 'artificial intelligence' },
    { name: 'CyberSec Nexus 2027', slug: 'cybersec-nexus-2027', color: '#ef4444', hint: 'cyber security' },
    { name: 'Innovate & Create Fest', slug: 'innovate-create-fest', color: '#f97316', hint: 'creative workshop' },
];

function generateFakeEvent(index: number, existingCount: number, user: User): Event {
    const themeIndex = (existingCount + index) % FAKE_EVENT_THEMES.length;
    const cycle = Math.floor((existingCount + index) / FAKE_EVENT_THEMES.length) + 1;
    const theme = FAKE_EVENT_THEMES[themeIndex];
    const eventId = `evt_${crypto.randomUUID()}`;
    
    const formFields = [
      { name: "full_name", label: "Full Name", type: "text", placeholder: "John Doe", required: true, options: [] },
      { name: "email", label: "Email Address", type: "email", placeholder: "john.doe@example.com", required: true, options: [] },
    ];
    
    const newEvent: Event = {
        id: eventId,
        name: `${theme.name} ${cycle > 1 ? `#${cycle}`: ''}`.trim(),
        slug: `${theme.slug}${cycle > 1 ? `-${cycle}` : ''}`,
        date: `10/10/2027`,
        location: { types: ['Virtual'], address: '' },
        description: `This is a generated test event for the ${theme.name}. Discover the latest trends and network with professionals.`,
        heroImage: { src: `https://picsum.photos/seed/${theme.slug}${cycle}/1200/800`, hint: theme.hint },
        formFields: formFields,
        rodo: 'You agree to our test terms and conditions by registering.',
        isActive: Math.random() > 0.5,
        themeColor: theme.color,
        ownerId: user.uid,
        members: { [user.uid!]: 'owner' }
    };
    return newEvent;
}


export default function AdminDashboardPage() {
  const { user: firebaseUser, isUserLoading: isAuthLoading } = useUser();
  const { showTestDataButtons } = useAppSettings();
  const { toast } = useToast();
  
  const [appUser, setAppUser] = useState<User | null>(null);
  const [isAppUserLoading, setIsAppUserLoading] = useState(true);
  
  const firestore = useFirestore();

  const [isGenerating, startGeneratingTransition] = useTransition();
  const [isPurging, startPurgeTransition] = useTransition();
  const [isPurgeAlertOpen, setPurgeAlertOpen] = useState(false);
  const [isGenerateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generationCount, setGenerationCount] = useState(3);

  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events')) : null, [firestore]);
  const { data: allEvents, isLoading: areEventsLoading } = useCollection<Event>(eventsQuery);

  useEffect(() => {
    const loadAppUser = async () => {
      if (!isAuthLoading) {
        if (!firebaseUser) {
          redirect('/login');
          return;
        }
        
        let foundAppUser: User | null = null;
        if (firebaseUser.email) {
            foundAppUser = await getAppUserByEmailAction(firebaseUser.email);
        }

        if (foundAppUser) {
          setAppUser({ ...foundAppUser, uid: firebaseUser.uid });
        } else {
          setAppUser(null);
        }
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

  const handleGenerateEvents = (count: number) => {
    if (!firestore || !appUser || !appUser.uid) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or database not available.' });
      return;
    }
    if (!count || count <= 0 || count > 50) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: 'Please enter a number between 1 and 50.' });
      return;
    }

    startGeneratingTransition(async () => {
      setGenerateDialogOpen(false);
      try {
        const batch = writeBatch(firestore);
        const existingCount = allEvents?.length || 0;
        for (let i = 0; i < count; i++) {
            const newEvent = generateFakeEvent(i, existingCount, appUser);
            const eventRef = doc(firestore, 'events', newEvent.id);
            batch.set(eventRef, newEvent);
        }
        await batch.commit();
        toast({ title: 'Success', description: `${count} new test events have been generated.` });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Generation Failed', description: error.message || 'An unknown error occurred.' });
      }
    });
  };

  const handlePurgeEvents = () => {
    if (!firestore) return;
    startPurgeTransition(async () => {
        try {
            const batch = writeBatch(firestore);
            
            if (!allEvents || allEvents.length === 0) {
              toast({ title: 'Info', description: 'No events to purge.' });
              setPurgeAlertOpen(false);
              return;
            }

            for (const event of allEvents) {
                const eventRef = doc(firestore, 'events', event.id);

                const registrationsRef = collection(firestore, 'events', event.id, 'registrations');
                const registrationsSnap = await getDocs(registrationsRef);
                const qrIdsToDelete: string[] = [];
                registrationsSnap.forEach(regDoc => {
                    batch.delete(regDoc.ref);
                    const regData = regDoc.data();
                    if (regData.qrId) {
                        qrIdsToDelete.push(regData.qrId);
                    }
                });

                for (const qrId of qrIdsToDelete) {
                    batch.delete(doc(firestore, 'qrcodes', qrId));
                }

                const formFieldsRef = collection(firestore, 'events', event.id, 'formFields');
                const formFieldsSnap = await getDocs(formFieldsRef);
                formFieldsSnap.forEach(fieldDoc => batch.delete(fieldDoc.ref));
                
                batch.delete(eventRef);
            }
            
            await batch.commit();
            toast({ title: 'Success', description: 'All events and their related data have been purged.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Purge Failed', description: error.message || 'An unknown error occurred.' });
        } finally {
            setPurgeAlertOpen(false);
        }
    });
  };


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
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">
            Manage your events and view their status.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
            {appUser.role === 'Administrator' && (
            <Button asChild>
                <Link href="/admin/events/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Event
                </Link>
            </Button>
            )}
            {appUser.role === 'Administrator' && showTestDataButtons && (
                <>
                    <Button onClick={() => setGenerateDialogOpen(true)} disabled={isGenerating || isPurging} variant="outline">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Generate Test Events
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => setPurgeAlertOpen(true)}
                        disabled={isPurging || isGenerating || !allEvents || allEvents.length === 0}
                    >
                        {isPurging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Purge All Events
                    </Button>
                </>
            )}
        </div>
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

      <AlertDialog open={isPurgeAlertOpen} onOpenChange={setPurgeAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL events and ALL associated data (registrations, QR codes, etc.). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPurging}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurgeEvents} disabled={isPurging} className="bg-destructive hover:bg-destructive/90">
              {isPurging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Purge All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isGenerateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Generate Test Events</DialogTitle>
                <DialogDescription>
                    How many test events would you like to create?
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
                e.preventDefault();
                handleGenerateEvents(generationCount);
            }}>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="generation-count" className="text-right">
                            Amount
                        </Label>
                        <Input
                            id="generation-count"
                            type="number"
                            value={generationCount}
                            onChange={(e) => setGenerationCount(Number(e.target.value))}
                            className="col-span-3"
                            min="1"
                            max="50"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isGenerating}>
                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
