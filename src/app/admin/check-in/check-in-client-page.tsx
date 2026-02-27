'use client';

/**
 * @fileOverview Real-time On-site Check-in System.
 * This module provides two ways to confirm participant arrival:
 * 1. QR Code Scanner: High-performance client-side image processing.
 * 2. Manual List: Searchable table with instant status toggling.
 * 
 * Performance Note: Camera frames are analyzed via requestAnimationFrame 
 * to ensure smooth UI transitions during scanning.
 */

import { useState, useMemo, useEffect, useRef, useTransition } from 'react';
import type { Event, Registration } from '@/lib/types';
import { useFirestore, useUser } from '@/firebase/provider';
import { collection, query, onSnapshot, FirestoreError, orderBy, doc, updateDoc, where, getDocs } from 'firebase/firestore';
import jsQR from 'jsqr';

import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CameraOff, Download, ChevronDown, ArrowUpDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

/**
 * Specialized CSV generator for check-in status reports.
 * Includes attendance timestamps.
 */
function convertCheckInToCSV(data: Registration[], headers: {key: string, label: string}[]) {
    const headerRow = [
        'Registration Date',
        ...headers.map(h => h.label),
        'Checked-In Status',
        'Check-In Time'
    ].join('|');

    const rows = data.map(reg => {
         const date = reg.registrationDate ? new Date(reg.registrationDate).toLocaleString() : 'N/A';
         const checkInStatus = reg.checkedIn ? 'YES' : 'NO';
         const checkInTime = reg.checkedIn && reg.checkInTime ? new Date(reg.checkInTime).toLocaleString() : 'N/A';
         const formValues = headers.map(h => {
                let value = reg.formData[h.key];
                if (Array.isArray(value)) {
                    value = value.join('; ');
                }
                if (typeof value === 'boolean') {
                    return value ? 'Yes' : 'No';
                }
                return value ?? '';
            });
         
         const values = [
            date,
            ...formValues,
            checkInStatus,
            checkInTime
         ];
         return values.join('|');
    });

    return [headerRow, ...rows].join('\n');
}

type SortConfig = {
  key: 'attendee' | 'status';
  direction: 'asc' | 'desc' | null;
};

export function CheckInClientPage({ events }: { events: Event[] }) {
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(events[0]?.id);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, isUserLoading: isAuthLoading } = useUser();

  // QR Scanner State - uses refs for direct DOM/MediaStream access to bypass React's render cycle for performance.
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; userName?: string } | null>(null);
  const [isProcessingScan, startScanTransition] = useTransition();

  // Manual Check-in State
  const [searchTerm, setSearchTerm] = useState('');
  const [isToggling, startToggleTransition] = useTransition();
  const [isExporting, startExportTransition] = useTransition();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'attendee', direction: 'asc' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);

  /**
   * Real-time listener for the attendee list.
   * Crucial for multi-gate scenarios where multiple organizers are checking in people simultaneously.
   */
  useEffect(() => {
    if (isAuthLoading || !firestore || !selectedEventId) {
      setIsLoading(true);
      setRegistrations([]);
      return;
    }

    if (!user) {
      setError("Authentication is required to access check-in data.");
      setIsLoading(false);
      setRegistrations([]);
      return;
    }
    
    setIsLoading(true);
    const q = query(collection(firestore, 'events', selectedEventId, 'registrations'), orderBy('registrationDate', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const regs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
        setRegistrations(regs);
        setIsLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        console.error("Firestore snapshot error:", err);
        setError("Could not fetch registrations. Check security rules and network connection.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, selectedEventId, user, isAuthLoading]);
  
  /**
   * QR Validation Engine:
   * 1. Looks up the registration document using the denormalized qrId index.
   * 2. Validates if the user hasn't already checked in (double-entry prevention).
   * 3. Updates the timestamp and status atomically.
   */
  const checkInUserByQrIdClient = async (eventId: string, qrId: string) => {
    if (!firestore) return { success: false, message: 'Firestore not available' };
    try {
        const registrationsRef = collection(firestore, 'events', eventId, 'registrations');
        const q = query(registrationsRef, where('qrId', '==', qrId));
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: 'Registration not found.' };
        }

        const registrationDoc = querySnapshot.docs[0];
        const registrationData = { id: registrationDoc.id, ...registrationDoc.data() } as Registration;

        if (registrationData.checkedIn) {
            const checkInTime = registrationData.checkInTime ? new Date(registrationData.checkInTime).toLocaleString() : '';
            return { 
                success: false, 
                message: `User already checked in at ${checkInTime}.`,
                userName: (registrationData.formData as any).full_name || 'N/A'
            };
        }

        await updateDoc(registrationDoc.ref, {
            checkedIn: true,
            checkInTime: new Date().toISOString()
        });
        
        return { 
            success: true, 
            message: 'Check-in successful!',
            userName: (registrationData.formData as any).full_name || 'N/A'
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown server error occurred.';
        console.error("Check-in error:", error);
        return { success: false, message };
    }
  };

  /**
   * MediaStream Lifecycle Handler:
   * Manages camera permissions and frame-by-frame analysis loop.
   */
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    /**
     * Scanner Loop:
     * Samples the video feed, draws it to a hidden canvas, and runs jsQR on the pixels.
     */
    const tick = () => {
      if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (ctx) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code && !isProcessingScan) {
              handleQrCode(code.data);
              return; // Halt scanning once a code is identified.
            }
          } catch (e) {
            console.error('Error getting image data from canvas:', e);
          }
        }
      }
      if (isScanning) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    const startCamera = async () => {
      setScanResult(null);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          // Prefer back-facing camera for on-site scanning tablets/phones.
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            videoRef.current.oncanplay = () => {
              animationFrameId = requestAnimationFrame(tick);
            };
          }
        } catch (err) {
          console.error("Camera access denied:", err);
          setHasCameraPermission(false);
          setIsScanning(false);
        }
      } else {
        setHasCameraPermission(false);
        setIsScanning(false);
      }
    };

    const stopCamera = () => {
      cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.oncanplay = null;
      }
    };

    if (isScanning) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isScanning, isProcessingScan, selectedEventId]);

  const handleQrCode = (qrId: string) => {
    if (!selectedEventId) return;
    setIsScanning(false);
    startScanTransition(async () => {
        const result = await checkInUserByQrIdClient(selectedEventId, qrId);
        setScanResult(result);
        toast({
            title: result.success ? 'Success!' : 'Scan Result',
            description: `${result.userName ? `${result.userName}: ` : ''}${result.message}`,
            variant: result.success ? 'default' : 'destructive',
            duration: 5000,
        });
    });
  }

  const filteredAndSortedRegistrations = useMemo(() => {
    let result = registrations.filter(reg => {
      const name = (reg.formData as any).full_name || '';
      const email = (reg.formData as any).email || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             email.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (sortConfig.direction) {
        result = [...result].sort((a, b) => {
            let aVal: any;
            let bVal: any;
            if (sortConfig.key === 'attendee') {
                aVal = ((a.formData as any).full_name || '').toLowerCase();
                bVal = ((b.formData as any).full_name || '').toLowerCase();
            } else {
                aVal = a.checkedIn ? 1 : 0;
                bVal = b.checkedIn ? 1 : 0;
            }
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return result;
  }, [registrations, searchTerm, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize, selectedEventId]);

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filteredAndSortedRegistrations.length / (pageSize as number));
  const paginatedRegistrations = pageSize === 'all'
    ? filteredAndSortedRegistrations
    : filteredAndSortedRegistrations.slice((currentPage - 1) * (pageSize as number), currentPage * (pageSize as number));

  const toggleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key, direction: null };
        return { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const SortIcon = ({ columnKey }: { columnKey: SortConfig['key'] }) => {
    if (sortConfig.key !== columnKey || !sortConfig.direction) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />;
  };

  const handleToggleCheckIn = (registration: Registration) => {
      if (!selectedEventId || !firestore) return;
      startToggleTransition(async () => {
          const newStatus = !registration.checkedIn;
          const registrationRef = doc(firestore, 'events', selectedEventId, 'registrations', registration.id);
          try {
            await updateDoc(registrationRef, {
                checkedIn: newStatus,
                checkInTime: newStatus ? new Date().toISOString() : null
            });
            toast({
                title: 'Success',
                description: `${(registration.formData as any).full_name} status updated.`,
            });
          } catch(error: any) {
              toast({
                  title: 'Error',
                  description: error.message || "An unknown error occurred",
                  variant: 'destructive',
              });
          }
      });
  };
  
  const handleExport = (format: 'excel' | 'plain') => {
    if (!selectedEventId || !selectedEvent) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select an event to export.' });
        return;
    }
    if (registrations.length === 0) {
        toast({ variant: 'destructive', title: 'Export Failed', description: 'No registrations to export for this event.' });
        return;
    }
    startExportTransition(() => {
        try {
            const headers = selectedEvent.formFields.map(field => ({ key: field.name, label: field.label }));
            let csvData = convertCheckInToCSV(registrations, headers);

            if (format === 'excel') {
                csvData = `sep=|\n${csvData}`;
            }
            
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const safeEventName = selectedEvent.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.setAttribute('download', `checkin-status_${safeEventName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: 'Success', description: 'Attendee check-in status exported successfully.' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to export data.';
            toast({ variant: 'destructive', title: 'Export Failed', description: message });
        }
    });
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Check-In</CardTitle>
        <CardDescription>Scan QR codes or manually check in attendees for an event.</CardDescription>
        <div className="pt-4 flex flex-col sm:flex-row gap-4">
          <Select onValueChange={setSelectedEventId} defaultValue={selectedEventId}>
            <SelectTrigger className="w-full sm:w-[320px]">
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
            <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => handleExport('excel')}>For Excel</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExport('plain')}>Plain CSV</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {selectedEventId ? (
          <Tabs defaultValue="scanner" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scanner" onClick={() => setIsScanning(false)}>QR Scanner</TabsTrigger>
              <TabsTrigger value="manual" onClick={() => setIsScanning(false)}>Manual Check-in</TabsTrigger>
            </TabsList>

            <TabsContent value="scanner" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>QR Code Scanner</CardTitle>
                  <CardDescription>Point the camera at an attendee's QR code to check them in.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    {!isScanning ? (
                        <Button onClick={() => setIsScanning(true)}>Start Scanner</Button>
                    ) : (
                        <Button onClick={() => setIsScanning(false)} variant="destructive">Stop Scanner</Button>
                    )}
                    
                    {isScanning && hasCameraPermission === null && (
                         <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Requesting camera access...</div>
                    )}

                    {hasCameraPermission === false && (
                        <Alert variant="destructive">
                            <CameraOff className="h-4 w-4" />
                            <AlertTitle>Camera Access Denied</AlertTitle>
                            <AlertDescription>Please enable camera permissions in your browser settings to use the scanner.</AlertDescription>
                        </Alert>
                    )}

                    <div className={cn("relative w-full max-w-md aspect-square bg-muted rounded-lg overflow-hidden", !isScanning && "hidden")}>
                        <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
                        <div className="absolute inset-0 border-8 border-white/50 rounded-lg" style={{ clipPath: 'polygon(0% 0%, 0% 100%, 25% 100%, 25% 25%, 75% 25%, 75% 75%, 25% 75%, 25% 100%, 100% 100%, 100% 0%)' }}/>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />

                    {isProcessingScan && (
                        <div className="flex items-center text-lg font-semibold"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Processing...</div>
                    )}
                    
                    {scanResult && !isProcessingScan && (
                         <Alert variant={scanResult.success ? 'default' : 'destructive'} className="w-full max-w-md">
                            <AlertTitle>{scanResult.success ? 'Check-in Successful!' : 'Scan Failed'}</AlertTitle>
                            <AlertDescription>{scanResult.userName}: {scanResult.message}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Manual Attendee List</CardTitle>
                  <CardDescription>Search for an attendee and manually toggle their check-in status.</CardDescription>
                  <div className="pt-2">
                      <Input 
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoading || isAuthLoading ? (
                        <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
                    ) : error ? (
                        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
                    ) : (
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-left">
                                                <Button variant="ghost" size="sm" onClick={() => toggleSort('attendee')} className="-ml-3 h-8">
                                                    Attendee
                                                    <SortIcon columnKey="attendee" />
                                                </Button>
                                            </TableHead>
                                            <TableHead className="text-left">
                                                <Button variant="ghost" size="sm" onClick={() => toggleSort('status')} className="-ml-3 h-8">
                                                    Status
                                                    <SortIcon columnKey="status" />
                                                </Button>
                                            </TableHead>
                                            <TableHead className="text-left">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedRegistrations.length > 0 ? paginatedRegistrations.map(reg => (
                                            <TableRow key={reg.id}>
                                                <TableCell>
                                                    <div className="font-medium">{(reg.formData as any).full_name || 'N/A'}</div>
                                                    <div className="text-sm text-muted-foreground">{(reg.formData as any).email || 'N/A'}</div>
                                                </TableCell>
                                                <TableCell>
                                                    {reg.checkedIn ? (
                                                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                                            Checked-In
                                                            {reg.checkInTime && <span className="hidden sm:inline ml-1.5 text-xs">({format(new Date(reg.checkInTime), 'HH:mm')})</span>}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary">Not Present</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Button 
                                                        variant={reg.checkedIn ? 'outline' : 'default'} 
                                                        size="sm"
                                                        onClick={() => handleToggleCheckIn(reg)}
                                                        disabled={isToggling}
                                                    >
                                                        {isToggling ? <Loader2 className="h-4 w-4 animate-spin"/> : (reg.checkedIn ? 'Undo Check-in' : 'Check-in')}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center text-muted-foreground">No matching registrations found.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {paginatedRegistrations.length > 0 && (
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
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="hidden h-8 w-8 p-0 lg:flex"
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                    </div>
                                </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Please select an event to manage check-ins.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
