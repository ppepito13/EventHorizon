
'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import type { Event, Registration, User, FormField as FormFieldType } from '@/lib/types';
import { collection, query, onSnapshot, FirestoreError, writeBatch, getDocs, doc } from 'firebase/firestore';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


interface RegistrationsClientPageProps {
  events: Event[];
  userRole: User['role'];
  demoUsers: User[];
}

// Helper functions previously in actions.ts
function convertToCSV(data: Registration[], headers: {key: string, label: string}[]) {
    const headerRow = ['Registration Date', 'QR ID', ...headers.map(h => h.label)].join('|');
    const rows = data.map(reg => {
        const date = reg.registrationDate ? new Date(reg.registrationDate).toLocaleString() : 'N/A';
        const values = [
            date,
            reg.qrId ?? '',
            ...headers.map(h => {
                let value = reg.formData[h.key];
                if (Array.isArray(value)) {
                    value = value.join('; ');
                }
                 if (typeof value === 'boolean') {
                    return value ? 'Yes' : 'No';
                }
                return value ?? '';
            })
        ];
        return values.join('|');
    });
    return [headerRow, ...rows].join('\n');
}

const FAKE_NAMES = ['Amelia', 'Benjamin', 'Chloe', 'Daniel', 'Evelyn', 'Finn', 'Grace', 'Henry', 'Isabella', 'Jack'];

function generateFakeData(fields: FormFieldType[], index: number) {  
  const name = `${FAKE_NAMES[index % FAKE_NAMES.length]} Testperson${index}`;
  const email = `${name.toLowerCase().replace(/\s/g, '.')}@example.com`;

  const formData: { [key: string]: any } = { rodo: true };

  fields.forEach(field => {
    switch (field.type) {
      case 'text':
        if (field.name.includes('name')) {
          formData[field.name] = name;
        } else if (field.name.includes('url')) {
          formData[field.name] = `https://example.com/${name.split(' ')[0].toLowerCase()}`;
        } else {
          formData[field.name] = `Some text for ${field.label}`;
        }
        break;
      case 'email':
        formData[field.name] = email;
        break;
      case 'tel':
        formData[field.name] = `+48 ${Math.floor(100000000 + Math.random() * 900000000)}`;
        break;
      case 'checkbox':
        formData[field.name] = Math.random() > 0.5;
        break;
      case 'textarea':
        formData[field.name] = `This is some longer fake text for the field: ${field.label}. It is generated for ${name}.`;
        break;
      case 'radio':
        if (field.options && field.options.length > 0) {
          formData[field.name] = field.options[Math.floor(Math.random() * field.options.length)];
        }
        break;
      case 'multiple-choice':
        if (field.options && field.options.length > 0) {
          const numChoices = Math.floor(Math.random() * field.options.length) + 1;
          formData[field.name] = [...field.options].sort(() => 0.5 - Math.random()).slice(0, numChoices);
        }
        break;
      default:
        formData[field.name] = '';
    }
  });

  return formData;
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
  const [isGenerateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generationCount, setGenerationCount] = useState(5);


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
    if (!deleteDialogState.eventId || !deleteDialogState.regId || !firestore) return;
    const { eventId, regId } = deleteDialogState;

    startDeleteTransition(async () => {
        try {
            const batch = writeBatch(firestore);
            const registrationDocRef = doc(firestore, 'events', eventId, 'registrations', regId);
            
            const registrationToDelete = registrations.find(r => r.id === regId);
            const qrId = registrationToDelete?.qrId;

            batch.delete(registrationDocRef);

            if (qrId) {
                const qrDocRef = doc(firestore, 'qrcodes', qrId);
                batch.delete(qrDocRef);
            }
            
            await batch.commit();

            toast({
                title: "Success",
                description: 'Registration and associated QR code deleted successfully.',
            });
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: error.message || 'An unknown error occurred.',
            });
        } finally {
            setDeleteDialogState({ isOpen: false, eventId: null, regId: null });
        }
    });
  };
  
  const handleGenerateData = (count: number) => {
    if (!selectedEventId || !selectedEvent || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select an event first.' });
      return;
    }
    if (!count || count <= 0 || count > 100) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: 'Please enter a number between 1 and 100.' });
      return;
    }
    
    startGeneratingTransition(async () => {
      setGenerateDialogOpen(false);
      try {
        const batch = writeBatch(firestore);
        const existingRegsCount = registrations.length;
        for (let i = 0; i < count; i++) {
            const registrationTime = new Date();
            const formData = generateFakeData(selectedEvent.formFields, existingRegsCount + i);

            const qrId = `qr_${crypto.randomUUID()}`;
            const qrDocRef = doc(firestore, 'qrcodes', qrId);
            const qrCodeData = {
                eventId: selectedEventId,
                eventName: selectedEvent.name,
                formData,
                registrationDate: registrationTime.toISOString(),
            };
            batch.set(qrDocRef, qrCodeData);

            const registrationId = `reg_${crypto.randomUUID()}`;
            const newRegistrationData = {
                eventId: selectedEventId,
                eventName: selectedEvent.name,
                formData: formData,
                qrId: qrId,
                registrationDate: registrationTime.toISOString(),
                eventOwnerId: selectedEvent.ownerId,
                eventMembers: selectedEvent.members,
                checkedIn: false,
                checkInTime: null,
            };
            const registrationDocRef = doc(firestore, 'events', selectedEventId, 'registrations', registrationId);
            batch.set(registrationDocRef, newRegistrationData);
        }
        
        await batch.commit();
        toast({ title: 'Success', description: `${count} new registrations have been generated.` });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Generation Failed', description: error.message || 'An unknown error occurred.' });
      }
    });
  };

  const handlePurgeData = () => {
    if (!selectedEventId || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select an event first.' });
        return;
    }
    startPurgeTransition(async () => {
        try {
            const registrationsColRef = collection(firestore, 'events', selectedEventId, 'registrations');
            const snapshot = await getDocs(registrationsColRef);

            if (snapshot.empty) {
                toast({ title: 'Info', description: 'No registrations to purge.' });
                setPurgeAlertOpen(false);
                return;
            }

            const batch = writeBatch(firestore);
            const qrIdsToDelete: string[] = [];
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
                const data = doc.data();
                if (data.qrId) {
                    qrIdsToDelete.push(data.qrId);
                }
            });

            for (const qrId of qrIdsToDelete) {
                const qrDocRef = doc(firestore, 'qrcodes', qrId);
                batch.delete(qrDocRef);
            }

            await batch.commit();

            const count = snapshot.size;
            toast({ title: 'Success', description: `Successfully purged ${count} registrations.` });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Purge Failed', description: error.message || 'An unknown error occurred.' });
        } finally {
            setPurgeAlertOpen(false);
        }
    });
  };

  const handleExport = (format: 'excel' | 'plain') => {
    if (!selectedEventId || !selectedEvent) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select an event to export.' });
        return;
    }
    startExportTransition(async () => {
        if (registrations.length === 0) {
            toast({ variant: 'destructive', title: 'Export Failed', description: 'No registrations to export.' });
            return;
        }

        try {
            const headers = selectedEvent.formFields.map(field => ({ key: field.name, label: field.label }));
            let csvData = convertToCSV(registrations, headers);

            if (format === 'excel') {
                csvData = `sep=|\n${csvData}`;
            }

            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const safeEventName = selectedEvent.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.setAttribute('download', `registrations_${safeEventName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: 'Success', description: 'Registrations exported successfully.' });
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Export Failed', description: error.message || 'Unknown error during export.' });
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
                      <Button onClick={() => setGenerateDialogOpen(true)} disabled={isGenerating || !selectedEventId} size="sm">
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

      <Dialog open={isGenerateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Generate Test Data</DialogTitle>
                <DialogDescription>
                    How many test registrations would you like to create for "{selectedEvent?.name}"?
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
                e.preventDefault();
                handleGenerateData(generationCount);
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
                            max="100"
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
