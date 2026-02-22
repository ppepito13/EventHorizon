'use client';

import { useState, useMemo, useTransition, useEffect, useCallback } from 'react';
import type { Event, Registration, User } from '@/lib/types';
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
import { exportRegistrationsAction, getRegistrationsAction, deleteRegistrationAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface RegistrationsClientPageProps {
  events: Event[];
  userRole: User['role'];
}

export function RegistrationsClientPage({ events, userRole }: RegistrationsClientPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(events[0]?.id);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [isExporting, startExportTransition] = useTransition();

  const [isAlertOpen, setAlertOpen] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<string | null>(null);

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  const fetchRegistrations = useCallback(async () => {
    if (!selectedEventId) {
        setRegistrations([]);
        return;
    }
    const result = await getRegistrationsAction(selectedEventId);
    if (result.success) {
        setRegistrations(result.data as Registration[]);
    } else {
        setRegistrations([]);
        if (result.error) {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    }
  }, [selectedEventId, toast]);

  useEffect(() => {
    if (isMounted) {
      setIsLoading(true);
      fetchRegistrations().finally(() => setIsLoading(false));
    }
  }, [fetchRegistrations, isMounted]);

  const handleDeleteRequest = (id: string) => {
    setRegistrationToDelete(id);
    setAlertOpen(true);
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!registrationToDelete) return;
    
    const result = await deleteRegistrationAction(registrationToDelete);

    // We MUST close the dialog regardless of success or failure to avoid a stuck UI
    setAlertOpen(false);

    if (result.success) {
        toast({ title: 'Success', description: result.message });
        // After a successful delete, refetch the data to update the list
        setIsLoading(true);
        fetchRegistrations().finally(() => setIsLoading(false));
    } else {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message,
        });
    }
    // Reset the ID after the operation
    setRegistrationToDelete(null);
  }, [registrationToDelete, fetchRegistrations, toast]);


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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Registrations</CardTitle>
          <CardDescription>
            View and manage event registrations. Select an event to see its attendees.
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            {isMounted ? (
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
            ) : (
                <>
                    <Skeleton className="h-10 w-full sm:w-[280px]" />
                    <Skeleton className="h-10 w-[128px]" />
                </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedEvent ? (
            <RegistrationsTable 
              event={selectedEvent} 
              registrations={registrations} 
              userRole={userRole}
              onDelete={handleDeleteRequest}
              isLoading={isLoading}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {isLoading ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : <p>{events.length > 0 ? 'Please select an event to view registrations.' : 'No events found.'}</p>}
            </div>
          )}
        </CardContent>
      </Card>
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
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
