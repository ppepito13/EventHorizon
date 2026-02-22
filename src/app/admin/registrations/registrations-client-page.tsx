
'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import type { Event, Registration, User } from '@/lib/types';
import { collection, query, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { signInWithEmailAndPassword, type Auth, createUserWithEmailAndPassword } from 'firebase/auth';

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
import { Download, Loader2, ChevronDown, AlertCircle } from 'lucide-react';
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
import { 
    exportRegistrationsAction, 
    getSeedDataAction, 
    generateFakeRegistrationsAction,
} from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface RegistrationsClientPageProps {
  events: Event[];
  userRole: User['role'];
  demoUsers: User[];
}

type DebugInfo = {
    timestamp: string;
    registrationId: string;
    status: 'initiated' | 'success' | 'error';
    message?: string;
} | null;

export function RegistrationsClientPage({ events, userRole, demoUsers }: RegistrationsClientPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(events[0]?.id);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  
  const [isExporting, startExportTransition] = useTransition();
  const [isSeeding, startSeedingTransition] = useTransition();
  const [isGenerating, startGeneratingTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    eventId: string | null;
    regId: string | null;
  }>({ isOpen: false, eventId: null, regId: null });

  const [lastDeleteAttempt, setLastDeleteAttempt] = useState<DebugInfo>(null);
  
  const firestore = useFirestore();
  const { auth, user: firebaseUser, isUserLoading } = useFirebase();

  useEffect(() => {
    if (auth && !isUserLoading && (!firebaseUser || firebaseUser.isAnonymous) && userRole === 'Administrator') {
      const adminUser = demoUsers.find(u => u.role === 'Administrator');
      if (adminUser && adminUser.email && adminUser.password) {
        signInWithEmailAndPassword(auth, adminUser.email, adminUser.password).catch(error => {
          console.error("Automatic admin sign-in failed:", error);
          toast({
            variant: "destructive",
            title: "Auth Sync Failed",
            description: "Could not automatically log in to Firebase backend. Operations might be denied.",
          });
        });
      }
    }
  }, [auth, firebaseUser, isUserLoading, demoUsers, toast, userRole]);

  useEffect(() => {
    setIsMounted(true);
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedEventId) {
      return null;
    }
    return query(collection(firestore, 'events', selectedEventId, 'registrations'));
  }, [firestore, selectedEventId]);

  const { data: firestoreRegistrations, isLoading: isLoadingFirestore, error: firestoreError } = useCollection<Registration>(registrationsQuery);
  
  const allRegistrations = useMemo(() => {
    if (!firestoreRegistrations) return [];
    return [...firestoreRegistrations].sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
  }, [firestoreRegistrations]);

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  const handleDeleteRequest = (eventId: string, registrationId: string) => {
    setDialogState({ isOpen: true, eventId, regId: registrationId });
  };

  const handleDeleteConfirm = () => {
    if (!dialogState.eventId || !dialogState.regId || !firestore) return;

    startDeleteTransition(() => {
        const { eventId, regId } = dialogState;
        setLastDeleteAttempt({
            timestamp: new Date().toISOString(),
            registrationId: regId,
            status: 'initiated'
        });
        const registrationDocRef = doc(firestore, 'events', eventId, 'registrations', regId);
        
        deleteDoc(registrationDocRef)
            .then(() => {
                setLastDeleteAttempt(prev => ({...prev!, status: 'success' }));
                toast({
                    title: 'Success',
                    description: 'Registration deleted successfully.',
                });
            })
            .catch((error) => {
                setLastDeleteAttempt(prev => ({...prev!, status: 'error', message: error.message }));
                toast({
                    variant: 'destructive',
                    title: 'Deletion Failed',
                    description: error.message || 'An unknown error occurred.',
                });
            })
            .finally(() => {
                setDialogState({ isOpen: false, eventId: null, regId: null });
            });
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
      if (!auth || !firestore || !firebaseUser) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot seed data. Auth or database not ready.' });
        return;
      }
      
      if (firebaseUser.isAnonymous) {
          toast({ variant: 'destructive', title: 'Authentication Required', description: 'Please wait a moment for admin authentication to complete, then try again.' });
          return;
      }

      toast({ title: "Seeding...", description: "Provisioning admin permissions in database..." });

      try {
        const adminDocRef = doc(firestore, 'app_admins', firebaseUser.uid);
        await setDoc(adminDocRef, {});
        toast({ title: 'Success!', description: 'Admin permissions provisioned in database.' });
        
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Seeding Failed',
          description: error.message || 'An error occurred during the seeding process.',
        });
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

  const isLoading = !isMounted || isLoadingFirestore;

  const renderContent = () => {
    if (isLoading) {
       return (
          <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              <p>Loading registrations...</p>
          </div>
      );
    }
    
    if (firestoreError) {
      return (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Permission Denied</AlertTitle>
            <AlertDescription>
              Could not fetch registrations. This is likely a security rule issue. 
              Please ensure you have the correct permissions to view this data.
              <pre className="mt-2 text-xs bg-muted p-2 rounded-md font-mono whitespace-pre-wrap">
                {firestoreError.message}
              </pre>
            </AlertDescription>
          </Alert>
      );
    }

    if (!allRegistrations || allRegistrations.length === 0) {
       return (
        <div className="text-center py-12 text-muted-foreground">
          <p>No registrations found for this event.</p>
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
        isDeleting={isDeleting}
      />
    );
  }

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
                      <Button onClick={handleGenerateData} disabled={isGenerating || !selectedEventId || isSeeding} size="sm">
                          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {isGenerating ? 'Generating...' : 'Generate Data'}
                      </Button>
                      <Button onClick={handleSeedData} disabled={isSeeding || isGenerating || !auth} size="sm">
                          {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {isSeeding ? 'Seeding...' : 'Seed/Repair Data'}
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
      
      {userRole === 'Administrator' && <Card className="mt-4">
        <CardHeader>
            <CardTitle className="text-base">Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground font-mono space-y-2">
            <div>
                <span className="font-semibold">Last Delete Attempt:</span>
                {lastDeleteAttempt ? (
                    <pre className="p-2 bg-muted rounded-md mt-1 whitespace-pre-wrap">
                        {JSON.stringify(lastDeleteAttempt, null, 2)}
                    </pre>
                ) : (
                    <span> No delete operations attempted yet.</span>
                )}
            </div>
             <div>
                <span className="font-semibold">Firebase User:</span>
                <pre className="p-2 bg-muted rounded-md mt-1 whitespace-pre-wrap">
                    {isUserLoading ? 'Loading...' : JSON.stringify({
                        uid: firebaseUser?.uid,
                        email: firebaseUser?.email,
                        isAnonymous: firebaseUser?.isAnonymous,
                    }, null, 2)}
                </pre>
            </div>
        </CardContent>
      </Card>}
      
      <AlertDialog open={dialogState.isOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setDialogState({ isOpen: false, eventId: null, regId: null });
          }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this registration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
