
'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import type { Event, Registration, User } from '@/lib/types';
import { collection, query } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

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
    generateFakeRegistrationsAction,
    deleteRegistrationAction,
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

  const [isExporting, startExportTransition] = useTransition();
  const [isGenerating, startGeneratingTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    eventId: string | null;
    regId: string | null;
  }>({ isOpen: false, eventId: null, regId: null });

  const firestore = useFirestore();
  
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

  const handleDeleteConfirm = async () => {
    if (!dialogState.eventId || !dialogState.regId) return;
    const { eventId, regId } = dialogState;

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
        setDialogState({ isOpen: false, eventId: null, regId: null });
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
              {userRole === 'Administrator' && isMounted && (
                  <div className="flex flex-wrap gap-2">
                      <Button onClick={handleGenerateData} disabled={isGenerating || !selectedEventId} size="sm">
                          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {isGenerating ? 'Generating...' : 'Generate Test Data'}
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

      <AlertDialog open={dialogState.isOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setDialogState({ isOpen: false, eventId: null, regId: null });
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
    </>
  );
}
