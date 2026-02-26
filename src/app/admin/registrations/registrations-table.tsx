
'use client';

import type { Event, Registration, User } from '@/lib/types';
import { useState, useEffect } from 'react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoreHorizontal, Trash2, Eye, Pencil, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';


interface RegistrationsTableProps {
  event: Event;
  registrations: Registration[];
  userRole: User['role'];
  onDelete: (eventId: string, registrationId: string) => void;
  isLoading: boolean;
}

export function RegistrationsTable({ event, registrations, userRole, onDelete, isLoading }: RegistrationsTableProps) {
  const [detailsViewReg, setDetailsViewReg] = useState<Registration | null>(null);
  const [detailsQrCode, setDetailsQrCode] = useState<string>('');

  useEffect(() => {
    if (detailsViewReg && detailsViewReg.qrId) {
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
  }, [detailsViewReg]);

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
      // Fallback for potentially non-ISO strings from old data
      const d = new Date(dateString);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString();
      }
      return dateString;
    }
  };
  
  if (isLoading) {
      return (
          <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              <p>Loading registrations...</p>
          </div>
      );
  }

  if (registrations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No registrations found for this event.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Registration Date</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Email Address</TableHead>
              <TableHead className="text-center">Approved</TableHead>
              <TableHead className="text-right w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.map(reg => (
              <TableRow key={reg.id}>
                <TableCell>{formatDate(reg.registrationDate)}</TableCell>
                <TableCell>{getDisplayValue(getFullNameValue(reg.formData))}</TableCell>
                <TableCell>{getDisplayValue(getEmailValue(reg.formData))}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    {reg.isApproved ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Approved</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Clock className="h-5 w-5 text-amber-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Pending Approval</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => setDetailsViewReg(reg)}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Details</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View Details</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {userRole === 'Administrator' && (
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" asChild>
                                <Link href={`/admin/registrations/${event.id}/${reg.id}/edit`}>
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit Registration</span>
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Edit Registration</p>
                        </TooltipContent>
                        </Tooltip>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(event.id, reg.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <Dialog open={!!detailsViewReg} onOpenChange={(open) => !open && setDetailsViewReg(null)}>
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle>Registration Details</DialogTitle>
                <DialogDescription>
                    Full registration data for event: "{event.name}".
                </DialogDescription>
            </DialogHeader>
            {detailsViewReg && (
                <div className="mt-4 space-y-2 text-sm max-h-[60vh] overflow-y-auto pr-4">
                     <div className="grid grid-cols-3 gap-4 py-2 border-b">
                        <span className="font-semibold text-muted-foreground">Registration ID</span>
                        <span className="col-span-2 font-mono text-xs">{detailsViewReg.id}</span>
                    </div>
                     <div className="grid grid-cols-3 gap-4 py-2 border-b">
                        <span className="font-semibold text-muted-foreground">Registration Date</span>
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
                        <span className="font-semibold text-muted-foreground">Agreed to Terms</span>
                        <span className="col-span-2">{getDisplayValue(detailsViewReg.formData.rodo)}</span>
                     </div>
                     <div className="grid grid-cols-3 gap-4 py-2">
                        <span className="font-semibold text-muted-foreground">Approval Status</span>
                        <span className="col-span-2">{detailsViewReg.isApproved ? 'Approved' : 'Pending Approval'}</span>
                     </div>
                     {detailsQrCode && (
                        <>
                            <Separator className="my-2" />
                            <div className="py-2 text-center">
                                <h4 className="font-semibold text-muted-foreground mb-3">Check-in QR Code</h4>
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
    </>
  );
}
