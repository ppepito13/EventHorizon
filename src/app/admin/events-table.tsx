'use client';

import type { Event, User } from '@/lib/types';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { deleteEventAction, setActiveEventAction, deactivateEventAction } from './actions';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface EventsTableProps {
  events: Event[];
  userRole: User['role'];
}

export function EventsTable({ events, userRole }: EventsTableProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const handleSetActive = (id: string, makeActive: boolean) => {
    startTransition(async () => {
      const result = makeActive
        ? await setActiveEventAction(id)
        : await deactivateEventAction(id);

      if (result.success) {
        toast({ title: 'Success', description: result.message });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
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
      const result = await deleteEventAction(eventToDelete);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        setAlertOpen(false);
        setEventToDelete(null);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
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
            {events.map(event => (
              <TableRow key={event.id}>
                <TableCell>
                  <div className="flex items-center">
                    <Switch
                      checked={event.isActive}
                      onCheckedChange={(checked) => handleSetActive(event.id, checked)}
                      disabled={isPending}
                      aria-label={`Set ${event.name} as active`}
                    />
                  </div>
                </TableCell>
                <TableCell className="font-medium">{event.name}</TableCell>
                <TableCell>{event.date}</TableCell>
                <TableCell>{event.location}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => router.push(`/admin/events/${event.id}/edit`)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit Event</span>
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
            ))}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event.
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
