
'use client';

import type { Event, User } from '@/lib/types';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { MoreHorizontal, Trash2, Edit, Loader2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFirestore } from '@/firebase/provider';
import { doc, updateDoc, writeBatch, collection, getDocs } from 'firebase/firestore';

interface EventsTableProps {
  events: Event[];
  userRole: User['role'];
}

function formatLocation(location: { types: Array<'Virtual' | 'On-site'>, address?: string }) {
    if (!location || !location.types) return 'N/A';
    let locationString = location.types.join(' & ');
    if (location.types.includes('On-site') && location.address) {
        locationString += ` - ${location.address}`;
    }
    return locationString;
}

export function EventsTable({ events, userRole }: EventsTableProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isPending, startTransition] = useTransition();
  const [activeToggles, setActiveToggles] = useState<Record<string, boolean>>({});
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const handleSetActive = (id: string, makeActive: boolean) => {
    setActiveToggles(prev => ({ ...prev, [id]: true }));
    startTransition(async () => {
      try {
        const eventRef = doc(firestore, 'events', id);
        await updateDoc(eventRef, { isActive: makeActive });
        toast({ title: 'Success', description: 'Event status updated successfully.' });
      } catch(error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Could not update event status.',
        });
      } finally {
        setActiveToggles(prev => ({ ...prev, [id]: false }));
      }
    });
  };

  const openDeleteDialog = (id: string) => {
    setEventToDelete(id);
    setAlertOpen(true);
  };

  const handleDelete = () => {
    if (!eventToDelete) return;
    startTransition(async () => {
        if (!firestore) {
            toast({ variant: "destructive", title: "Error", description: "Firestore is not available." });
            return;
        }
        try {
            const eventId = eventToDelete;
            const batch = writeBatch(firestore);
            
            // Delete subcollections is not trivial on the client.
            // A more robust solution would be a Firebase Function.
            // For this app, we assume we can list and delete.
            const registrationsRef = collection(firestore, 'events', eventId, 'registrations');
            const registrationsSnap = await getDocs(registrationsRef);
            registrationsSnap.forEach(doc => batch.delete(doc.ref));

            const formFieldsRef = collection(firestore, 'events', eventId, 'formFields');
            const formFieldsSnap = await getDocs(formFieldsRef);
            formFieldsSnap.forEach(doc => batch.delete(doc.ref));

            // Delete main doc
            const eventRef = doc(firestore, 'events', eventId);
            batch.delete(eventRef);

            await batch.commit();

            toast({ title: 'Success', description: 'Event and all related data deleted.' });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: error.message || 'An unknown error occurred.',
            });
        } finally {
            setAlertOpen(false);
            setEventToDelete(null);
        }
    });
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/events/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
        title: "Link copied!",
        description: "The event registration link has been copied to your clipboard.",
    });
  };


  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Active</TableHead>
              <TableHead>Event Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length > 0 ? (
              events.map(event => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Switch
                        checked={event.isActive}
                        onCheckedChange={(checked) => handleSetActive(event.id, checked)}
                        disabled={isPending && activeToggles[event.id]}
                        aria-label={`Set ${event.name} as active`}
                      />
                       {(isPending && activeToggles[event.id]) && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell>{event.date}</TableCell>
                  <TableCell>{formatLocation(event.location)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" asChild>
                            <Link href={`/admin/events/${event.id}/edit`}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit Event</span>
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit Event</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => handleCopyLink(event.slug)}>
                              <LinkIcon className="h-4 w-4" />
                               <span className="sr-only">Copy Link</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy Link</p>
                        </TooltipContent>
                      </Tooltip>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <a href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer" className='cursor-pointer'>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open in new tab
                            </a>
                          </DropdownMenuItem>
                          {userRole === 'Administrator' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => openDeleteDialog(event.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        No events found. Start by creating a new event.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event and all associated registrations from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
