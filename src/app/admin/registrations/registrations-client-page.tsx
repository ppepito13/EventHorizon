
'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import type { Event, Registration, User } from '@/lib/types';
import { collection, query, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useFirebaseApp, errorEmitter, FirestorePermissionError, useAuth } from '@/firebase';
import { getApps } from 'firebase/app';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RegistrationsTable } from './registrations-table';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { exportRegistrationsAction, getSeedDataAction, generateFakeRegistrationsAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface RegistrationsClientPageProps {
  events: Event[];
  userRole: User['role'];
}

function DebugInfo({ states }: { states: Record<string, any> }) {
  return (
    <Card className="mt-6 bg-muted/30">
      <CardHeader>
        <CardTitle className="text-base">Debug Information</CardTitle>
        <CardDescription className="text-xs">
          This panel shows the real-time state of the application to help diagnose issues.
        </CardDescription>
      </CardHeader>
      <CardContent className="font-mono text-xs space-y-1">
        {Object.entries(states).map(([key, value]) => (
          <div key={key} className="flex justify-between items-start">
            <span className="text-muted-foreground font-semibold pr-4">{key}:</span>
            <span className="text-right break-all">{JSON.stringify(value)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RegistrationsClientPage({ events, userRole }: RegistrationsClientPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(events[0]?.id);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  
  const [isExporting, startExportTransition] = useTransition();
  const [isSeeding, startSeedingTransition] = useTransition();
  const [isGenerating, startGeneratingTransition] = useTransition();

  const [isAlertOpen, setAlertOpen] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [lastDeleteAttempt, setLastDeleteAttempt] = useState<object | null>(null);
  
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading, userError } = useUser();
  const firebaseApp = useFirebaseApp();

  useEffect(() => {
    setIsMounted(true);
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedEventId || !user) {
      return null;
    }
    return query(collection(firestore, 'events', selectedEventId, 'registrations'));
  }, [firestore, selectedEventId, user]);

  const { data: firestoreRegistrations, isLoading: isLoadingFirestore, error: firestoreError } = useCollection<Registration>(registrationsQuery);
  
  const allRegistrations = useMemo(() => {
    if (!firestoreRegistrations) return [];
    return [...firestoreRegistrations].sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
  }, [firestoreRegistrations]);

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  const handleDeleteRequest = (id: string) => {
    setRegistrationToDelete(id);
    setAlertOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!registrationToDelete || !selectedEventId || !firestore || !auth) return;
  
    // Set loading state for immediate UI feedback
    setIsDeleting(true);
    // Close the dialog immediately. Let the UI react to the data change.
    setAlertOpen(false); 
  
    const regRef = doc(firestore, 'events', selectedEventId, 'registrations', registrationToDelete);
    
    // Log the delete attempt for debugging
    setLastDeleteAttempt({ 
      id: registrationToDelete, 
      path: regRef.path,
      status: 'initiated', 
      timestamp: new Date().toISOString() 
    });

    // Fire-and-forget the delete operation. The real-time listener will update the UI.
    deleteDoc(regRef)
      .then(() => {
        toast({ title: 'Success', description: 'Registration delete request sent.' });
        // Log successful initiation
        setLastDeleteAttempt(prev => ({ ...prev, status: 'success (promise resolved)' }));
      })
      .catch((serverError) => {
        // Log the error for debugging
        setLastDeleteAttempt(prev => ({ 
          ...prev, 
          status: 'error (promise caught)', 
          error: serverError.message 
        }));
        
        // Create and emit a rich, contextual error for the error overlay
        const permissionError = new FirestorePermissionError({
            path: regRef.path,
            operation: 'delete',
        }, auth);
        errorEmitter.emit('permission-error', permissionError);

        // Also show a user-friendly toast
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'Could not delete the registration. Check permissions.',
        });
      })
      .finally(() => {
        // Reset loading and selection state regardless of outcome
        setIsDeleting(false);
        setRegistrationToDelete(null);
      });
  };
  
  const handleExport = (format: 'excel' | 'plain') => {
    if (!selectedEventId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select an event to export.' });
        return;
    }
    startExportTransition(async () => {
        const result = await exportRegistrationsAction(selectedEventId, format);
        if (result.success && result.csvData) {
            const blob = new Blob([result.csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const safeEventName = result.eventName?.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.setAttribute('download', `registrations_${safeEventName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: 'Success', description: 'Registrations exported successfully.' });
        } else {
            toast({ variant: 'destructive', title: 'Export Failed', description: result.error || 'No registrations to export.' });
        }
    });
  };

  const handleSeedData = () => {
    startSeedingTransition(async () => {
      if (isUserLoading) {
        toast({ title: "Please wait", description: "Authentication is still initializing. Cannot seed data yet." });
        return;
      }
      if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to seed data. No Firebase user found.' });
        return;
      }
      if (!firestore) {
         toast({ variant: 'destructive', title: 'Firestore Error', description: 'Firestore service is not available.' });
        return;
      }

      toast({ title: "Seeding...", description: "Fetching local seed data files..." });
      const result = await getSeedDataAction();

      if (!result.success || !result.data) {
        toast({ variant: 'destructive', title: 'Seeding Failed', description: result.message || 'Could not fetch seed data.' });
        return;
      }

      const { events: seedEvents, registrations: seedRegistrations } = result.data;

      if (!seedEvents.length && !seedRegistrations.length) {
         toast({ title: "No Data to Seed", description: "The seed files are empty." });
         return;
      }

      try {
        toast({ title: "Seeding Step 1/3", description: `Seeding ${seedEvents.length} events...` });
        const eventPromises: Promise<void>[] = [];
        const eventsToSeed = seedEvents.map(event => ({
          ...event,
          ownerId: user.uid,
          members: {},
          eventOwnerId: user.uid,
          eventMembers: {},
          eventIsActive: event.isActive,
        }));

        for (const event of eventsToSeed) {
            const eventRef = doc(firestore, 'events', event.id);
            eventPromises.push(setDoc(eventRef, event, { merge: true }));
        }
        await Promise.all(eventPromises);

        toast({ title: "Seeding Step 2/3", description: `Seeding ${seedRegistrations.length} registrations...` });
        const registrationPromises: Promise<void>[] = [];
        for (const reg of seedRegistrations) {
            if (reg.id && reg.eventId) {
                const parentEvent = eventsToSeed.find(e => e.id === reg.eventId);
                if (parentEvent) {
                    const regData = {
                      ...reg,
                      eventOwnerId: parentEvent.ownerId,
                      eventMembers: parentEvent.members,
                    };
                    const regRef = doc(firestore, 'events', reg.eventId, 'registrations', reg.id);
                    registrationPromises.push(setDoc(regRef, regData, { merge: true }));
                }
            }
        }
        await Promise.all(registrationPromises);
        
        if (userRole === 'Administrator' && user) {
          toast({ title: "Seeding Step 3/3", description: "Configuring admin role..." });
          const adminRef = doc(firestore, 'app_admins', user.uid);
          await setDoc(adminRef, { role: 'admin', seededAt: new Date().toISOString() }, { merge: true });
        }

        toast({ title: "Success!", description: `Seeding complete. ${eventsToSeed.length} events and ${seedRegistrations.length} registrations have been seeded/updated.` });
        
      } catch (e: any) {
        console.error("Seeding error:", e);
        if (e instanceof Error && 'code' in e && (e as any).code.includes('permission-denied')) {
          const permissionError = new FirestorePermissionError({
            path: 'app_admins',
            operation: 'write',
          }, auth);
          errorEmitter.emit('permission-error', permissionError);
          toast({ variant: 'destructive', title: 'Seeding Permission Error', description: 'Could not set admin role. Please check security rules for /app_admins.'});
        } else {
          toast({ variant: 'destructive', title: 'Seeding Failed', description: e.message || 'An unknown error occurred during seeding.' });
        }
      }
    });
  };
  
  const handleGenerateData = () => {
    if (!selectedEventId || !selectedEvent) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select an event first.' });
      return;
    }
    startGeneratingTransition(async () => {
      const result = await generateFakeRegistrationsAction(selectedEventId, selectedEvent.formFields);
      if (result.success) {
        toast({ title: 'Success', description: `${result.count} new registrations have been generated.` });
      } else {
        toast({ variant: 'destructive', title: 'Generation Failed', description: result.message || 'An unknown error occurred.' });
      }
    });
  };

  const isLoading = !isMounted || isLoadingFirestore || isUserLoading;
  const isSeedButtonDisabled = isSeeding || isUserLoading || !user;

  const getSeedButtonDisabledReason = () => {
    if (isSeeding) return "Seeding is in progress...";
    if (isUserLoading) return "Waiting for authentication...";
    if (!user) return "User is not authenticated.";
    return "Ready to seed.";
  }

  const renderContent = () => {
    if (firestoreError) {
      return (
          <div className="text-center py-12 text-destructive-foreground bg-destructive/90 rounded-md">
              <p className="font-bold">Permission Denied</p>
              <p className="text-sm mt-2 max-w-md mx-auto">Could not load registrations. This is likely a security rule issue.</p>
          </div>
      );
    }
    
    return (
      <RegistrationsTable 
        registrations={allRegistrations} 
        event={selectedEvent!}
        userRole={userRole}
        onDelete={handleDeleteRequest}
        isLoading={isLoading}
      />
    );
  }

  const allApps = getApps();

  const debugStates = {
      isMounted,
      isUserLoading,
      user: user ? { email: user.email, uid: user.uid, isAnonymous: user.isAnonymous } : null,
      userError: userError?.message || null,
      firebaseAppName: firebaseApp?.name,
      firebaseAppApiKey: firebaseApp?.options.apiKey,
      allFirebaseApps: allApps.map(app => ({ name: app.name, apiKey: app.options.apiKey })),
      selectedEventId,
      isLoadingFirestore,
      firestoreError: firestoreError?.message || null,
      registrationsCount: firestoreRegistrations?.length ?? 0,
      seedButtonDisabled: isSeedButtonDisabled,
      seedButtonReason: getSeedButtonDisabledReason(),
      lastDeleteAttempt: lastDeleteAttempt,
      isDeleting: isDeleting,
      registrationToDelete: registrationToDelete,
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                  <CardTitle>Registrations</CardTitle>
                  <CardDescription>
                      View and manage event registrations.
                  </CardDescription>
              </div>
              {userRole === 'Administrator' && isMounted && (
                  <div className="flex flex-wrap gap-2">
                      <Button onClick={handleGenerateData} disabled={isGenerating || !selectedEventId} size="sm">
                          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {isGenerating ? 'Generating...' : 'Generate Data'}
                      </Button>
                      <Button onClick={handleSeedData} disabled={isSeedButtonDisabled} size="sm">
                          {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {isUserLoading ? 'Authenticating...' : isSeeding ? 'Seeding...' : 'Seed/Repair Data'}
                      </Button>
                  </div>
              )}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            {!isMounted ? (
                <>
                    <Skeleton className="h-10 w-full sm:w-[280px]" />
                    <Skeleton className="h-10 w-[128px]" />
                </>
            ) : (
                <>
                    <Select onValueChange={setSelectedEventId} defaultValue={selectedEventId}>
                    <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                        {events.map(event => (
                        <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" disabled={isExporting || !selectedEventId || !allRegistrations || allRegistrations.length === 0}>
                            {isExporting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                            <Download className="mr-2 h-4 w-4" />
                            )}
                            Export
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => handleExport('excel')}>For Excel</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleExport('plain')}>Plain CSV</DropdownMenuItem>
                    </DropdownMenuContent>
                    </DropdownMenu>
                </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
      
      <DebugInfo states={debugStates} />
      
      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this registration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
