
'use client';

import { useState, useMemo, useEffect, useRef, useTransition } from 'react';
import type { Event, Registration } from '@/lib/types';
import { useFirestore } from '@/firebase/provider';
import { collection, query, onSnapshot, FirestoreError, orderBy } from 'firebase/firestore';
import jsQR from 'jsqr';

import { useToast } from '@/hooks/use-toast';
import { checkInUserByQrId, toggleCheckInStatus, exportCheckedInAttendeesAction } from './actions';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CameraOff, Download, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

export function CheckInClientPage({ events }: { events: Event[] }) {
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(events[0]?.id);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();

  // QR Scanner State
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


  useEffect(() => {
    if (!firestore || !selectedEventId) {
      setRegistrations([]);
      setIsLoading(false);
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
  }, [firestore, selectedEventId]);

  // QR Scanner Logic
  useEffect(() => {
    // Clean up streams when component unmounts or tab changes
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setIsScanning(true);
    setScanResult(null);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        requestAnimationFrame(tick);
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
    setIsScanning(false);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  const tick = () => {
    if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if(ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && !isProcessingScan) {
           handleQrCode(code.data);
           return; // Stop scanning after finding a code
        }
      }
    }
    if (isScanning) {
      requestAnimationFrame(tick);
    }
  };
  
  const handleQrCode = (qrId: string) => {
    if (!selectedEventId) return;
    stopCamera();
    startScanTransition(async () => {
        const result = await checkInUserByQrId(selectedEventId, qrId);
        setScanResult(result);
        toast({
            title: result.success ? 'Success!' : 'Scan Result',
            description: `${result.userName ? `${result.userName}: ` : ''}${result.message}`,
            variant: result.success ? 'default' : 'destructive',
            duration: 5000,
        });
    });
  }

  // Manual check-in logic
  const filteredRegistrations = useMemo(() => {
    return registrations.filter(reg => {
      const name = reg.formData.full_name || '';
      const email = reg.formData.email || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             email.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [registrations, searchTerm]);

  const handleToggleCheckIn = (registration: Registration) => {
      if (!selectedEventId) return;
      startToggleTransition(async () => {
          const newStatus = !registration.checkedIn;
          const result = await toggleCheckInStatus(selectedEventId, registration.id, newStatus);
          if (result.success) {
              toast({
                  title: 'Success',
                  description: `${registration.formData.full_name} status updated.`,
              });
          } else {
              toast({
                  title: 'Error',
                  description: result.message,
                  variant: 'destructive',
              });
          }
      });
  };
  
  const handleExport = (format: 'excel' | 'plain') => {
    if (!selectedEventId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select an event to export.' });
        return;
    }
    startExportTransition(async () => {
        const result = await exportCheckedInAttendeesAction(selectedEventId, format);
        if (result.success && result.csvData) {
            const blob = new Blob([result.csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const safeEventName = result.eventName?.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.setAttribute('download', `checkin-status_${safeEventName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: 'Success', description: 'Attendee check-in status exported successfully.' });
        } else {
            toast({ variant: 'destructive', title: 'Export Failed', description: result.error || 'No registrations to export.' });
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
            <DropdownMenuContent>
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
              <TabsTrigger value="scanner" onClick={stopCamera}>QR Scanner</TabsTrigger>
              <TabsTrigger value="manual" onClick={stopCamera}>Manual Check-in</TabsTrigger>
            </TabsList>

            <TabsContent value="scanner" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>QR Code Scanner</CardTitle>
                  <CardDescription>Point the camera at an attendee's QR code to check them in.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    {!isScanning ? (
                        <Button onClick={startCamera}>Start Scanner</Button>
                    ) : (
                        <Button onClick={stopCamera} variant="destructive">Stop Scanner</Button>
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
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
                    ) : error ? (
                        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Attendee</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRegistrations.length > 0 ? filteredRegistrations.map(reg => (
                                        <TableRow key={reg.id}>
                                            <TableCell>
                                                <div className="font-medium">{reg.formData.full_name || 'N/A'}</div>
                                                <div className="text-sm text-muted-foreground">{reg.formData.email || 'N/A'}</div>
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
                                            <TableCell className="text-right">
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
