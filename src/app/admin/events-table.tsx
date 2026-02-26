'use client';

import type { Event, User } from '@/lib/types';
import { useState, useTransition, useMemo, useEffect } from 'react';
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
import { 
  MoreHorizontal, 
  Trash2, 
  Edit, 
  Loader2, 
  Link as LinkIcon, 
  ExternalLink, 
  ChevronUp, 
  ChevronDown, 
  ArrowUpDown,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFirestore } from '@/firebase/provider';
import { doc, updateDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

type SortConfig = {
  key: keyof Event | 'locationFormatted';
  direction: 'asc' | 'desc' | null;
};

export function EventsTable({ events, userRole }: EventsTableProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isPending, startTransition] = useTransition();
  const [activeToggles, setActiveToggles] = useState<Record<string, boolean>>({});
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);

  const filteredAndSortedEvents = useMemo(() => {
    // 1. Filter
    let result = events.filter(event => {
        const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' 
            ? true 
            : statusFilter === 'active' ? event.isActive : !event.isActive;
        return matchesSearch && matchesStatus;
    });

    // 2. Sort
    if (!sortConfig.direction) return result;

    const parseDate = (d: string) => {
        if (!d) return 0;
        const firstDate = d.split(' - ')[0];
        const parts = firstDate.split('/');
        if (parts.length !== 3) return 0;
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
    };

    return result.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortConfig.key === 'locationFormatted') {
          aVal = formatLocation(a.location).toLowerCase();
          bVal = formatLocation(b.location).toLowerCase();
      } else if (sortConfig.key === 'date') {
          aVal = parseDate(a.date);
          bVal = parseDate(b.date);
      } else {
          aVal = (a[sortConfig.key as keyof Event] as any);
          bVal = (b[sortConfig.key as keyof Event] as any);
          if (typeof aVal === 'string') aVal = aVal.toLowerCase();
          if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [events, sortConfig, searchTerm, statusFilter]);

  // Reset to first page when search, filters, or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filteredAndSortedEvents.length / (pageSize as number));
  const paginatedEvents = pageSize === 'all' 
    ? filteredAndSortedEvents 
    : filteredAndSortedEvents.slice((currentPage - 1) * (pageSize as number), currentPage * (pageSize as number));

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

  const clearFilters = () => {
      setSearchTerm('');
      setStatusFilter('all');
  };

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
            
            const registrationsRef = collection(firestore, 'events', eventId, 'registrations');
            const registrationsSnap = await getDocs(registrationsRef);
            registrationsSnap.forEach(doc => batch.delete(doc.ref));

            const formFieldsRef = collection(firestore, 'events', eventId, 'formFields');
            const formFieldsSnap = await getDocs(formFieldsRef);
            formFieldsSnap.forEach(doc => batch.delete(doc.ref));

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

  const SortIcon = ({ columnKey }: { columnKey: SortConfig['key'] }) => {
    if (sortConfig.key !== columnKey || !sortConfig.direction) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />;
  };

  const isFiltered = searchTerm !== '' || statusFilter !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/30 p-4 rounded-lg">
          <div className="flex flex-1 items-center gap-2 w-full">
              <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Search events..."
                      className="pl-8 bg-background"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                  <SelectTrigger className="w-[150px] bg-background">
                      <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
              </Select>
              {isFiltered && (
                  <Button variant="ghost" onClick={clearFilters} className="h-10">
                      <X className="mr-2 h-4 w-4" />
                      Clear
                  </Button>
              )}
          </div>
          <div className="text-sm text-muted-foreground whitespace-nowrap">
              Found {filteredAndSortedEvents.length} events
          </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">
                <Button variant="ghost" size="sm" onClick={() => toggleSort('isActive')} className="-ml-3 h-8">
                    Active
                    <SortIcon columnKey="isActive" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => toggleSort('name')} className="-ml-3 h-8">
                    Event Name
                    <SortIcon columnKey="name" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => toggleSort('date')} className="-ml-3 h-8">
                    Date
                    <SortIcon columnKey="date" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => toggleSort('locationFormatted')} className="-ml-3 h-8">
                    Location
                    <SortIcon columnKey="locationFormatted" />
                </Button>
              </TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEvents.length > 0 ? (
              paginatedEvents.map(event => (
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
                    <div className="flex items-center gap-2">
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
                        <DropdownMenuContent align="start">
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
                        {isFiltered ? "No events match your search criteria." : "No events found. Start by creating a new event."}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
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
    </div>
  );
}
