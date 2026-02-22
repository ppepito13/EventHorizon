
'use client';

import { useState, useMemo, useEffect, useCallback, useTransition } from 'react';
import type { Event, Registration, User } from '@/lib/types';
import { collection, query } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { getJsonRegistrations } from '@/lib/data';

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
import { exportRegistrationsAction, deleteRegistrationAction } from './actions';
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

  // State for deletion dialog
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // State for data from registrations.json
  const [jsonRegistrations, setJsonRegistrations] = useState<Registration[]>([]);
  const [isLoadingJson, setIsLoadingJson] = useState(false);

  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchJsonRegistrations = useCallback(async () => {
    if (!selectedEventId) {
      setJsonRegistrations([]);
      return;
    }
    setIsLoadingJson(true);
    try {
      const data = await getJsonRegistrations(selectedEventId);
      setJsonRegistrations(data);
    } catch (error) {
      console.error("Failed to fetch JSON registrations:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load local registrations.' });
    } finally {
      setIsLoadingJson(false);
    }
  }, [selectedEventId, toast]);

  // Fetch JSON data when event selection changes
  useEffect(() => {
    fetchJsonRegistrations();
  }, [fetchJsonRegistrations]);

  // Real-time listener for Firestore data
  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedEventId || !user || isUserLoading) return null;
    return query(collection(firestore, 'events', selectedEventId, 'registrations'));
  }, [firestore, selectedEventId, user, isUserLoading]);

  const { data: firestoreRegistrations, isLoading: isLoadingFirestore } = useCollection<Registration>(registrationsQuery);
  
  // Memoized function to merge and sort data from both sources
  const allRegistrations = useMemo(() => {
    const combined = [...(firestoreRegistrations || []), ...jsonRegistrations];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    return unique.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
  }, [firestoreRegistrations, jsonRegistrations]);

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  const handleDeleteRequest = useCallback((id: string) => {
    setRegistrationToDelete(id);
    setAlertOpen(true);
  }, []);
  
  const handleCloseDialog = useCallback(() => {
    if (isDeleting) return; // Prevent closing while a delete operation is in-flight
    setAlertOpen(false);
    setRegistrationToDelete(null);
  }, [isDeleting]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!registrationToDelete || !selectedEventId) return;

    setIsDeleting(true);
    const result = await deleteRegistrationAction(selectedEventId, registrationToDelete);
    
    if (result.success) {
        toast({ title: 'Success', description: result.message });
        await fetchJsonRegistrations(); // Refetch JSON data to update the view
        handleCloseDialog();
    } else {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message || 'An unknown error occurred.',
        });
    }
    // Firestore's useCollection hook handles its own update, no extra refresh needed for it.
    setIsDeleting(false);

  }, [registrationToDelete, selectedEventId, toast, fetchJsonRegistrations, handleCloseDialog]);

  const handleExport = (format: 'excel' | 'plain') => {
    if (!selectedEventId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select an event to export.' });
        return;
    }
    startExportTransition(async () => {
        // NOTE: This export currently only exports from Firestore. 
        // For a complete export, this action would also need to read the JSON file.
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
  
  const isLoading = !isMounted || isLoadingFirestore || isLoadingJson || isUserLoading;

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
          {selectedEvent ? (
            <RegistrationsTable 
              registrations={allRegistrations} 
              event={selectedEvent}
              userRole={userRole}
              onDelete={handleDeleteRequest}
              isLoading={isLoading}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {isMounted ? <p>{events.length > 0 ? 'Please select an event to view registrations.' : 'No events found.'}</p> : <Loader2 className="mx-auto h-8 w-8 animate-spin" />}
            </div>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={isAlertOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this registration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={handleCloseDialog}>Cancel</AlertDialogCancel>
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
