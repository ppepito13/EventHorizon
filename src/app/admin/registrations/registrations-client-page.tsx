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
import { Download, Loader2, ChevronDown, AlertCircle, Trash2, Mail, Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
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
import { RichTextEditor } from '@/components/ui/rich-text-editor';


interface RegistrationsClientPageProps {
  events: Event[];
  userRole: User['role'];
}

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


export function RegistrationsClientPage({ events, userRole }: RegistrationsClientPageProps) {
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

  // Filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'absent'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);

  const [deleteDialogState, setDeleteDialogState] = useState<{
    isOpen: boolean;
    eventId: string | null;
    regId: string | null;
  }>({ isOpen: false, eventId: null, regId: null });
  
  const [isPurgeAlertOpen, setPurgeAlertOpen] = useState(false);
  const [isGenerateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generationCount, setGenerationCount] = useState(5);

  // Email state
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isEmailConfirmOpen, setIsEmailConfirmOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState(JSON.stringify([{ type: 'paragraph', children: [{ text: '' }] }]));


  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  
  useEffect(() => {
    setIsMounted(true);
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  // Safety Effect for unresponsiveness: Ensures pointer-events are restored if dialogs get stuck
  useEffect(() => {
    if (!isEmailDialogOpen && !isEmailConfirmOpen) {
      const timer = setTimeout(() => {
        if (document.body.style.pointerEvents === 'none') {
          console.warn("Force restoring pointer events after dialog closure.");
          document.body.style.pointerEvents = 'auto';
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isEmailDialogOpen, isEmailConfirmOpen]);

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

  // Derived filtered registrations
  const filteredRegistrations = useMemo(() => {
    if (!selectedEvent) return [];

    const fullNameField = selectedEvent.formFields.find(f => f.label.toLowerCase().includes('full name'));
    const emailField = selectedEvent.formFields.find(f => f.label.toLowerCase().includes('email'));
    
    const getFullNameValue = (formData: { [key: string]: any }) => {
        if (fullNameField && formData[fullNameField.name]) {
            return formData[fullNameField.name];
        }
        return formData['fullName'] || formData['full_name'];
    };

    const getEmailValue = (formData: { [key: string]: any }) => {
        if (emailField && formData[emailField.name]) {
            return formData[emailField.name];
        }
        return formData['email'];
    };

    return registrations.filter(reg => {
        const name = (getFullNameValue(reg.formData) || '').toLowerCase();
        const email = (getEmailValue(reg.formData) || '').toLowerCase();
        const matchesSearch = name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
        
        const matchesApproval = approvalFilter === 'all'
            ? true
            : approvalFilter === 'approved' ? reg.isApproved : !reg.isApproved;
            
        const matchesAttendance = attendanceFilter === 'all'
            ? true
            : attendanceFilter === 'present' ? reg.checkedIn : !reg.checkedIn;

        return matchesSearch && matchesApproval && (attendanceFilter === 'all' || matchesAttendance);
    });
  }, [registrations, selectedEvent, searchTerm, approvalFilter, attendanceFilter]);

  // Handle pagination reset
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, approvalFilter, attendanceFilter, pageSize, selectedEventId]);

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filteredRegistrations.length / (pageSize as number));
  const paginatedRegistrations = pageSize === 'all'
    ? filteredRegistrations
    : filteredRegistrations.slice((currentPage - 1) * (pageSize as number), currentPage * (pageSize as number));

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
                isApproved: !selectedEvent.requiresApproval,
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
        if (filteredRegistrations.length === 0) {
            toast({ variant: 'destructive', title: 'Export Failed', description: 'No registrations to export.' });
            return;
        }

        try {
            const headers = selectedEvent.formFields.map(field => ({ key: field.name, label: field.label }));
            let csvData = convertToCSV(filteredRegistrations, headers);

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

  const clearFilters = () => {
      setSearchTerm('');
      setApprovalFilter('all');
      setAttendanceFilter('all');
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
        registrations={paginatedRegistrations}
        event={selectedEvent!}
        userRole={userRole}
        onDelete={handleDeleteRequest}
        isLoading={isDeleting}
      />
    );
  }

  const isFiltered = searchTerm !== '' || approvalFilter !== 'all' || attendanceFilter !== 'all';
  const isOnSite = selectedEvent?.location.types.includes('On-site');

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
                    <div className="flex items-center gap-2">
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
                        <Button 
                            variant="outline" 
                            disabled={!selectedEventId || !registrations || registrations.length === 0}
                            onClick={() => setIsEmailDialogOpen(true)}
                        >
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
                        </Button>
                    </div>
                </>
            )}
          </div>

          {selectedEventId && registrations.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/30 p-4 rounded-lg mt-4">
                <div className="flex flex-wrap flex-1 items-center gap-2 w-full">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search attendees..."
                            className="pl-8 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {selectedEvent?.requiresApproval && (
                        <Select value={approvalFilter} onValueChange={(val: any) => setApprovalFilter(val)}>
                            <SelectTrigger className="w-[160px] bg-background">
                                <SelectValue placeholder="Approval" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Approval</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                    {isOnSite && (
                        <Select value={attendanceFilter} onValueChange={(val: any) => setAttendanceFilter(val)}>
                            <SelectTrigger className="w-[160px] bg-background">
                                <SelectValue placeholder="Attendance" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Attendance</SelectItem>
                                <SelectItem value="present">Present Only</SelectItem>
                                <SelectItem value="absent">Absent Only</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                    {isFiltered && (
                        <Button variant="ghost" onClick={clearFilters} className="h-10 px-2 sm:px-4">
                            <X className="mr-2 h-4 w-4" />
                            Clear
                        </Button>
                    )}
                </div>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                    Found {filteredRegistrations.length} registrations
                </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {renderContent()}
          
          {selectedEventId && registrations.length > 0 && (
            <div className="flex items-center justify-between px-2 pt-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Rows per page</p>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => setPageSize(value === 'all' ? 'all' : Number(value))}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={pageSize.toString()} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 25, 50, "all"].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                  Page {currentPage} of {totalPages || 1}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Go to first page</span>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    <span className="sr-only">Go to next page</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    <span className="sr-only">Go to last page</span>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Debug Info Context */}
          <div className="mt-8 p-3 bg-muted/50 rounded-lg border border-dashed text-[10px] font-mono space-y-1">
              <p className="font-bold text-muted-foreground uppercase tracking-wider mb-1">Debug Context</p>
              <div className="grid grid-cols-2 gap-2 max-w-xs">
                  <span>Editor Dialog:</span>
                  <span className={isEmailDialogOpen ? "text-green-600 font-bold" : "text-red-600"}>{isEmailDialogOpen ? 'OPEN' : 'CLOSED'}</span>
                  <span>Confirm Popup:</span>
                  <span className={isEmailConfirmOpen ? "text-green-600 font-bold" : "text-red-600"}>{isEmailConfirmOpen ? 'OPEN' : 'CLOSED'}</span>
                  <span>Total Recipients:</span>
                  <span>{filteredRegistrations.length}</span>
              </div>
          </div>
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

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent 
            className="max-w-2xl"
            onInteractOutside={(e) => {
                // Prevent closure of main dialog when the alert dialog is active
                if (isEmailConfirmOpen) {
                    e.preventDefault();
                }
            }}
        >
            <DialogHeader>
                <DialogTitle>Send Email to Registrants</DialogTitle>
                <DialogDescription>
                    Compose a message to all attendees registered for "{selectedEvent?.name}".
                </DialogDescription>
                <p className="text-sm font-semibold text-primary">
                    Message will be sent to <strong className="font-bold">{filteredRegistrations.length}</strong> participants.
                </p>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="email-subject">Message Title</Label>
                    <Input 
                        id="email-subject" 
                        placeholder="e.g. Important update regarding the event" 
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Message Body</Label>
                    <div className="border rounded-md overflow-hidden bg-background">
                        <div className="resize-y overflow-auto min-h-[300px] max-h-[600px]">
                            <RichTextEditor 
                                value={emailBody} 
                                onChange={setEmailBody} 
                            />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        You can resize the editor by dragging the bottom-right corner.
                    </p>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cancel</Button>
                <Button 
                    onClick={() => setIsEmailConfirmOpen(true)}
                    disabled={!emailSubject.trim() || filteredRegistrations.length === 0}
                >
                    Send Message
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isEmailConfirmOpen} onOpenChange={setIsEmailConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send this message to <strong className="font-bold">{filteredRegistrations.length}</strong> participants? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
                toast({
                    title: "Message sent (Mock)",
                    description: `Your message "${emailSubject}" has been sent to ${filteredRegistrations.length} recipients.`,
                });
                setIsEmailConfirmOpen(false);
                setIsEmailDialogOpen(false);
                // Clear form
                setEmailSubject('');
                setEmailBody(JSON.stringify([{ type: 'paragraph', children: [{ text: '' }] }]));
            }}>
              Confirm & Send
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
