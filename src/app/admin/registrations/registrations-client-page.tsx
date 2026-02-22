
'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import type { Event, Registration, User } from '@/lib/types';
import { collection, query } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
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
import { exportRegistrationsAction, deleteRegistrationAction, seedRegistrationsFromJSON } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface RegistrationsClientPageProps {
  events: Event[];
  userRole: User['role'];
}

export function RegistrationsClientPage({ events, userRole }: RegistrationsClientPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(events[0]?.id);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  
  const [isExporting, startExportTransition] = useTransition();
  const [isSeeding, startSeedingTransition] = useTransition();

  const [isAlertOpen, setAlertOpen] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedEventId || !user || isUserLoading) return null;
    return query(collection(firestore, 'events', selectedEventId, 'registrations'));
  }, [firestore, selectedEventId, user, isUserLoading]);

  const { data: firestoreRegistrations, isLoading: isLoadingFirestore } = useCollection<Registration>(registrationsQuery);
  
  const allRegistrations = useMemo(() => {
    if (!firestoreRegistrations) return [];
    return [...firestoreRegistrations].sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
  }, [firestoreRegistrations]);

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  const handleDeleteRequest = (id: string) => {
    setRegistrationToDelete(id);
    setAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!registrationToDelete || !selectedEventId) return;

    setIsDeleting(true);
    const result = await deleteRegistrationAction(selectedEventId, registrationToDelete);
    
    if (result.success) {
        toast({ title: 'Success', description: result.message });
        // The real-time listener from useCollection will automatically update the UI.
    } else {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message || 'An unknown error occurred.',
        });
    }
    
    // This logic ensures the dialog closes *after* the action is complete, preventing race conditions.
    setIsDeleting(false);
    setAlertOpen(false);
    setRegistrationToDelete(null);
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
        const result = await seedRegistrationsFromJSON();
        if (result.success) {
            toast({ title: "Success!", description: result.message });
            // Data will appear automatically via the real-time listener.
        } else {
            toast({ variant: 'destructive', title: 'Seeding Failed', description: result.message });
        }
    });
  };
  
  const isLoading = !isMounted || isLoadingFirestore || isUserLoading;

  const renderContent = () => {
    if (isLoading) {
      return <RegistrationsTable registrations={[]} event={selectedEvent!} userRole={userRole} onDelete={()=>{}} isLoading={true} />;
    }

    if (selectedEvent && allRegistrations.length > 0) {
      return (
        <RegistrationsTable 
          registrations={allRegistrations} 
          event={selectedEvent}
          userRole={userRole}
          onDelete={handleDeleteRequest}
          isLoading={false}
        />
      );
    }
    
    if (isMounted && selectedEvent) {
      return (
        <div className="text-center py-12 text-muted-foreground space-y-4">
          <p>No registrations found for this event in Firestore.</p>
          <Button onClick={handleSeedData} disabled={isSeeding}>
            {isSeeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Seed Test Data
          </Button>
          <p className="text-xs text-muted-foreground/80">This will migrate test data from `registrations.json` into the database.</p>
        </div>
      );
    }

    return (
      <div className="text-center py-12 text-muted-foreground">
        {isMounted ? <p>{events.length > 0 ? 'Please select an event to view registrations.' : 'No events found.'}</p> : <Loader2 className="mx-auto h-8 w-8 animate-spin" />}
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Registrations</CardTitle>
          <CardDescription>
            View and manage event registrations.
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
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
      <AlertDialog open={isAlertOpen} onOpenChange={(open) => {
        // Prevent closing the dialog while the deletion is in progress
        if (isDeleting) return;
        setAlertOpen(open);
        if (!open) {
          setRegistrationToDelete(null);
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
              {isDeleting ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
