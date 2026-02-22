'use client';

import type { Event, Registration, User } from '@/lib/types';
import { useState, useTransition } from 'react';
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoreHorizontal, Trash2, Loader2, Eye, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteRegistrationAction } from './actions';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useEffect } from 'react';


interface RegistrationsTableProps {
  event: Event;
  registrations: Registration[];
  userRole: User['role'];
  onRegistrationDeleted: () => void;
}

export function RegistrationsTable({ event, registrations, userRole, onRegistrationDeleted }: RegistrationsTableProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<string | null>(null);
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

  // Find the actual keys for Full Name and Email from the event's form fields config
  const fullNameField = event.formFields.find(f => f.label.toLowerCase().includes('full name'));
  const emailField = event.formFields.find(f => f.label.toLowerCase().includes('email'));
  
  const getFullNameValue = (formData: { [key: string]: any }) => {
    if (fullNameField && formData[fullNameField.name]) {
      return formData[fullNameField.name];
    }
    // Fallback for older data structures
    return formData['fullName'] || formData['full_name'];
  };

  const getEmailValue = (formData: { [key: string]: any }) => {
    if (emailField && formData[emailField.name]) {
      return formData[emailField.name];
    }
    // Fallback for older data structures
    return formData['email'];
  };


  const openDeleteDialog = (id: string) => {
    setRegistrationToDelete(id);
    setAlertOpen(true);
  };

  const handleDelete = () => {
    if (!registrationToDelete) return;

    startTransition(async () => {
      const result = await deleteRegistrationAction(registrationToDelete);

      setAlertOpen(false);

      if (result.success) {
        toast({ title: 'Success', description: result.message });
        onRegistrationDeleted();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
      
      setRegistrationToDelete(null);
    });
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
              <TableHead className="text-right w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.map(reg => (
              <TableRow key={reg.id}>
                <TableCell>{new Date(reg.registrationDate).toLocaleString()}</TableCell>
                <TableCell>{getDisplayValue(getFullNameValue(reg.formData))}</TableCell>
                <TableCell>{getDisplayValue(getEmailValue(reg.formData))}</TableCell>
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
                                <Link href={`/admin/registrations/${reg.id}/edit`}>
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
                          onClick={() => openDeleteDialog(reg.id)}
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
      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this registration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
                        <span className="col-span-2">{new Date(detailsViewReg.registrationDate).toLocaleString()}</span>
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
                     <div className="grid grid-cols-3 gap-4 py-2">
                        <span className="font-semibold text-muted-foreground">Agreed to Terms</span>
                        <span className="col-span-2">{getDisplayValue(detailsViewReg.formData.rodo)}</span>
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
