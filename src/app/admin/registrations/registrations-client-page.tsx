
'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import type { Event, Registration, User } from '@/lib/types';
import { collection, query, onSnapshot, FirestoreError } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase/provider';
import { useAppSettings } from '@/context/app-settings-provider';

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
import { Download, Loader2, ChevronDown, AlertCircle, Trash2 } from 'lucide-react';
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
    generateFakeRegistrationsAction,
    deleteRegistrationAction,
    purgeRegistrationsAction,
} from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


interface RegistrationsClientPageProps {
  events: Event[];
  userRole: User['role'];
  demoUsers: User[];
}

export function RegistrationsClientPage({ events, userRole, demoUsers }: RegistrationsClientPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(events[0]?.id);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const { showTestDataButtons } = useAppSettings();

  const [isExporting, startExportTransition] = useTransition();
  const [isGenerating, startGeneratingTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isPurging, startPurgeTransition] = useTransition();

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoadingFirestore, setIsLoadingFirestore] = useState(true);
  const [firestoreError, setFirestoreError] = useState<FirestoreError | null>(null);

  const [deleteDialogState, setDeleteDialogState] = useState<{
    isOpen: boolean;
    eventId: string | null;
    regId: string | null;
  }>({ isOpen: false, eventId: null, regId: null });
  
  const [isPurgeAlertOpen, setPurgeAlertOpen] = useState(false);


  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  
  useEffect(() => {
    setIsMounted(true);
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    if (isAuthLoading || !firestore || !selectedEventId) {
        if (isMounted) {
          setIsLoadingFirestore(true);
        }
        setRegistrations([]);
        return;
    }
    
    if (!user) {
        setFirestoreError(new FirestoreError('permission-denied', 'You must be logged in to view registrations.'));
        setIsLoadingFirestore(false);
        setRegistrations([]);
        return;
    }

    setIsLoadingFirestore(true);
    const q = query(collection(firestore, 'events', selectedEventId, 'registrations'));
    
    const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
            const regs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
            setRegistrations(regs.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime()));
            setIsLoadingFirestore(false);
            setFirestoreError(null);
        }, 
        (error) => {
            console.error("Firestore snapshot error:", error);
            setFirestoreError(error);
            setIsLoadingFirestore(false);
        }
    );

    return () => unsubscribe();
  }, [firestore, selectedEventId, isMounted, user, isAuthLoading]);

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  const handleDeleteRequest = (eventId: string, registrationId: string) => {
    setDeleteDialogState({ isOpen: true, eventId, regId: registrationId });
  };

  const handleDeleteConfirm = () => {
    if (!deleteDialogState.eventId || !deleteDialogState.regId) return;
    const { eventId, regId } = deleteDialogState;

    startDeleteTransition(async () => {
        const result = await deleteRegistrationAction(eventId, regId);

        if (result.success) {
            toast({
                title: "Success",
                description: result.message,
            });
        } else {
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: result.message,
            });
        }
        setDeleteDialogState({ isOpen: false, eventId: null, regId: null });
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

  const handlePurgeData = () => {
    if (!selectedEventId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select an event first.' });
        return;
    }
    startPurgeTransition(async () => {
        const result = await purgeRegistrationsAction(selectedEventId);
        if (result.success) {
            toast({ title: 'Success', description: result.message || `${result.count} registrations have been purged.` });
        } else {
            toast({ variant: 'destructive', title: 'Purge Failed', description: result.message || 'An unknown error occurred.' });
        }
        setPurgeAlertOpen(false);
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

  const isLoading = !isMounted || isLoadingFirestore || isAuthLoading;

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
              <pre className="mt-2 text-xs bg-muted p-2 rounded-md font-mono whitespace-pre-wrap">
                {firestoreError.message}
              </pre>
            </AlertDescription>
          </Alert>
      );
    }

    if (!registrations || registrations.length === 0) {
       return (
        <div className="text-center py-12 text-muted-foreground">
          <p>No registrations found for this event.</p>
        </div>
      );
    }
    
    return (
      <RegistrationsTable
        registrations={registrations}
        event={selectedEvent!}
        userRole={userRole}
        onDelete={handleDeleteRequest}
        isLoading={isDeleting}
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
              {userRole === 'Administrator' && isMounted && showTestDataButtons && (
                  <div className="flex flex-wrap gap-2">
                      <Button onClick={handleGenerateData} disabled={isGenerating || !selectedEventId} size="sm">
                          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {isGenerating ? 'Generating...' : 'Generate Test Data'}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setPurgeAlertOpen(true)}
                        disabled={isPurging || isGenerating || !selectedEventId || !registrations || registrations.length === 0}
                        size="sm"
                      >
                        {isPurging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {isPurging ? 'Purging...' : 'Purge Data'}
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
                        <Button variant="outline" disabled={isExporting || !selectedEventId || !registrations || registrations.length === 0}>
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

      <AlertDialog open={deleteDialogState.isOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setDeleteDialogState({ isOpen: false, eventId: null, regId: null });
          }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this registration and its associated QR code.
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

      <AlertDialog open={isPurgeAlertOpen} onOpenChange={setPurgeAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all registrations and their QR codes for the selected event ({selectedEvent?.name}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPurging}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurgeData} disabled={isPurging} className="bg-destructive hover:bg-destructive/90">
              {isPurging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Purge All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
