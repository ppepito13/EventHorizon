
'use client';

import type { Event, Registration, User } from '@/lib/types';
import { useState, useEffect, useTransition, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MoreHorizontal, 
  Trash2, 
  Eye, 
  Pencil, 
  Loader2, 
  CheckCircle2, 
  Clock,
  UserCheck,
  UserX,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { useFirestore } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { notifyRegistrationStatusChange } from '@/app/actions';


interface RegistrationsTableProps {
  event: Event;
  registrations: Registration[];
  userRole: User['role'];
  onDelete: (eventId: string, registrationId: string) => void;
  isLoading: boolean;
}

type SortConfig = {
  key: 'registrationDate' | 'fullName' | 'email' | 'isApproved';
  direction: 'asc' | 'desc' | null;
};

export function RegistrationsTable({ event, registrations, userRole, onDelete, isLoading }: RegistrationsTableProps) {
  const [detailsViewReg, setDetailsViewReg] = useState<Registration | null>(null);
  const [detailsQrCode, setDetailsQrCode] = useState<string>('');
  const [isUpdating, startUpdateTransition] = useTransition();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'registrationDate', direction: 'desc' });
  
  const firestore = useFirestore();
  const { toast } = useToast();

  const isOnSite = event.location.types.includes('On-site');

  useEffect(() => {
    if (detailsViewReg && detailsViewReg.qrId && isOnSite) {
      QRCode.toDataURL(detailsViewReg.qrId, { errorCorrectionLevel: 'H', width: 256 })
        .then(url => {
          setDetailsQrCode(url);
        })
        .catch(err => {
          console.error(err);
          setDetailsQrCode('');
        });
    } else {
      setDetailsQrCode('');
    }
  }, [detailsViewReg, isOnSite]);

  const fullNameField = event.formFields.find(f => f.label.toLowerCase().includes('full name'));
  const emailField = event.formFields.find(f => f.label.toLowerCase().includes('email'));
  
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

  const sortedRegistrations = useMemo(() => {
    if (!sortConfig.direction) return registrations;

    return [...registrations].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortConfig.key) {
        case 'registrationDate':
          aVal = new Date(a.registrationDate).getTime();
          bVal = new Date(b.registrationDate).getTime();
          break;
        case 'fullName':
          aVal = (getFullNameValue(a.formData) || '').toLowerCase();
          bVal = (getFullNameValue(b.formData) || '').toLowerCase();
          break;
        case 'email':
          aVal = (getEmailValue(a.formData) || '').toLowerCase();
          bVal = (getEmailValue(b.formData) || '').toLowerCase();
          break;
        case 'isApproved':
          aVal = a.isApproved ? 1 : 0;
          bVal = b.isApproved ? 1 : 0;
          break;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [registrations, sortConfig]);

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

  const getDisplayValue = (value: any) => {
    if (value === null || value === undefined || value === '') return <span className="text-muted-foreground/70">N/A</span>;
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return value.toString();
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd/MM/yyyy, HH:mm:ss");
    } catch (error) {
      const d = new Date(dateString);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString();
      }
      return dateString;
    }
  };

  const handleToggleApproval = (registration: Registration) => {
    if (!firestore) return;
    
    startUpdateTransition(async () => {
      const newStatus = !registration.isApproved;
      const regRef = doc(firestore, 'events', event.id, 'registrations', registration.id);
      
      try {
          await updateDoc(regRef, { isApproved: newStatus });
          
          const userEmail = getEmailValue(registration.formData);
          const userName = getFullNameValue(registration.formData);
          
          let qrCodeUrl;
          if (newStatus && registration.qrId && isOnSite) {
              qrCodeUrl = await QRCode.toDataURL(registration.qrId, { errorCorrectionLevel: 'H', width: 256 });
          }

          if (userEmail) {
              await notifyRegistrationStatusChange(
                  { name: event.name, date: event.date },
                  { email: userEmail, name: userName || 'Uczestniku' },
                  newStatus,
                  qrCodeUrl
              );
          }

          toast({
            title: 'Sukces',
            description: `Status zaktualizowany. Powiadomienie e-mail zostało wysłane.`,
          });
      } catch (error: any) {
          toast({
            variant: 'destructive',
            title: 'Błąd',
            description: error.message || 'Nie udało się zaktualizować statusu.',
          });
      }
    });
  };
  
  if (isLoading) {
      return (
          <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              <p>Wczytywanie rejestracji...</p>
          </div>
      );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">
                <Button variant="ghost" size="sm" onClick={() => toggleSort('registrationDate')} className="-ml-3 h-8">
                    Registration Date
                    <SortIcon columnKey="registrationDate" />
                </Button>
              </TableHead>
              <TableHead className="text-left">
                <Button variant="ghost" size="sm" onClick={() => toggleSort('fullName')} className="-ml-3 h-8">
                    Full Name
                    <SortIcon columnKey="fullName" />
                </Button>
              </TableHead>
              <TableHead className="text-left">
                <Button variant="ghost" size="sm" onClick={() => toggleSort('email')} className="-ml-3 h-8">
                    Email Address
                    <SortIcon columnKey="email" />
                </Button>
              </TableHead>
              {event.requiresApproval && (
                <TableHead className="text-left">
                    <Button variant="ghost" size="sm" onClick={() => toggleSort('isApproved')} className="-ml-3 h-8">
                        Approved
                        <SortIcon columnKey="isApproved" />
                    </Button>
                </TableHead>
              )}
              <TableHead className="w-[150px] text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRegistrations.length > 0 ? (
              sortedRegistrations.map(reg => (
                <TableRow key={reg.id}>
                  <TableCell className="text-left">{formatDate(reg.registrationDate)}</TableCell>
                  <TableCell className="text-left">{getDisplayValue(getFullNameValue(reg.formData))}</TableCell>
                  <TableCell className="text-left">{getDisplayValue(getEmailValue(reg.formData))}</TableCell>
                  {event.requiresApproval && (
                    <TableCell className="text-left">
                      <div className="flex justify-start">
                        {reg.isApproved ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Zatwierdzony</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Clock className="h-5 w-5 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Oczekuje na decyzję</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-left">
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => setDetailsViewReg(reg)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Podgląd</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Szczegóły</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      {userRole === 'Administrator' && (
                          <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" asChild>
                                  <Link href={`/admin/registrations/${event.id}/${reg.id}/edit`}>
                                      <Pencil className="h-4 w-4" />
                                      <span className="sr-only">Edytuj</span>
                                  </Link>
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                              <p>Edycja danych</p>
                          </TooltipContent>
                          </Tooltip>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isUpdating}>
                            <span className="sr-only">Opcje</span>
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuLabel>Akcje</DropdownMenuLabel>
                          
                          {event.requiresApproval && (
                            <DropdownMenuItem
                              onClick={() => handleToggleApproval(reg)}
                              className={reg.isApproved ? "text-amber-600 focus:text-amber-600" : "text-green-600 focus:text-green-600"}
                            >
                              {reg.isApproved ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Cofnij zatwierdzenie
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Zatwierdź zgłoszenie
                                </>
                              )}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(event.id, reg.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Usuń rejestrację
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={event.requiresApproval ? 5 : 4} className="h-24 text-center text-muted-foreground">
                        Brak rejestracji spełniających kryteria.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <Dialog open={!!detailsViewReg} onOpenChange={(open) => !open && setDetailsViewReg(null)}>
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle>Szczegóły rejestracji</DialogTitle>
                <DialogDescription>
                    Dane dla wydarzenia: "{event.name}".
                </DialogDescription>
            </DialogHeader>
            {detailsViewReg && (
                <div className="mt-4 space-y-2 text-sm max-h-[60vh] overflow-y-auto pr-4">
                     <div className="grid grid-cols-3 gap-4 py-2 border-b">
                        <span className="font-semibold text-muted-foreground">ID Rejestracji</span>
                        <span className="col-span-2 font-mono text-xs">{detailsViewReg.id}</span>
                    </div>
                     <div className="grid grid-cols-3 gap-4 py-2 border-b">
                        <span className="font-semibold text-muted-foreground">Data rejestracji</span>
                        <span className="col-span-2">{formatDate(detailsViewReg.registrationDate)}</span>
                    </div>
                    {event.formFields.map(field => {
                        let value;
                        if (field.name === fullNameField?.name) {
                            value = getFullNameValue(detailsViewReg.formData);
                        } else if (field.name === emailField?.name) {
                            value = getEmailValue(detailsViewReg.formData);
                        } else {
                            value = detailsViewReg.formData[field.name];
                        }
                        
                        return (
                             <div key={field.name} className="grid grid-cols-3 gap-4 py-2 border-b">
                                 <span className="font-semibold text-muted-foreground">{field.label}</span>
                                 <span className="col-span-2 break-words">{getDisplayValue(value)}</span>
                             </div>
                        )
                    })}
                     <div className="grid grid-cols-3 gap-4 py-2 border-b">
                        <span className="font-semibold text-muted-foreground">Zgody (RODO)</span>
                        <span className="col-span-2">{getDisplayValue(detailsViewReg.formData.rodo)}</span>
                     </div>
                     {event.requiresApproval && (
                       <div className="grid grid-cols-3 gap-4 py-2">
                          <span className="font-semibold text-muted-foreground">Status akceptacji</span>
                          <span className="col-span-2">{detailsViewReg.isApproved ? 'Zatwierdzony' : 'Oczekujący'}</span>
                       </div>
                     )}
                     {detailsQrCode && (detailsViewReg.isApproved || !event.requiresApproval) && isOnSite && (
                        <>
                            <Separator className="my-2" />
                            <div className="py-2 text-center">
                                <h4 className="font-semibold text-muted-foreground mb-3">Kod QR uczestnika</h4>
                                <div className="flex justify-center">
                                    <Image src={detailsQrCode} alt="Registration QR Code" width={192} height={192} className="rounded-lg border p-1 bg-white" />
                                </div>
                                {detailsViewReg.qrId && <p className="text-xs text-muted-foreground mt-2 font-mono">{detailsViewReg.qrId}</p>}
                            </div>
                        </>
                    )}
                </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
