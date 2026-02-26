'use client';

import type { User } from '@/lib/types';
import { useState, useTransition, useMemo } from 'react';
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
  MoreHorizontal, 
  Trash2, 
  Edit, 
  Loader2, 
  ChevronUp, 
  ChevronDown, 
  ArrowUpDown,
  Search,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteUserAction } from './actions';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface UsersTableProps {
  users: User[];
}

type SortConfig = {
  key: 'name' | 'role';
  direction: 'asc' | 'desc' | null;
};

export function UsersTable({ users }: UsersTableProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

  // Filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Administrator' | 'Organizer'>('all');

  const filteredAndSortedUsers = useMemo(() => {
    // 1. Filter
    let result = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' ? true : user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // 2. Sort
    if (!sortConfig.direction) return result;

    return result.sort((a, b) => {
      let aVal = (a[sortConfig.key] || '').toLowerCase();
      let bVal = (b[sortConfig.key] || '').toLowerCase();

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, sortConfig, searchTerm, roleFilter]);

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
      setRoleFilter('all');
  };

  const SortIcon = ({ columnKey }: { columnKey: SortConfig['key'] }) => {
    if (sortConfig.key !== columnKey || !sortConfig.direction) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />;
  };

  const openDeleteDialog = (id: string) => {
    setUserToDelete(id);
    setAlertOpen(true);
  };

  const handleDelete = () => {
    if (!userToDelete) return;
    startTransition(async () => {
      const result = await deleteUserAction(userToDelete);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        setAlertOpen(false);
        setUserToDelete(null);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    });
  };

  const isFiltered = searchTerm !== '' || roleFilter !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/30 p-4 rounded-lg">
          <div className="flex flex-1 items-center gap-2 w-full">
              <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Search users..."
                      className="pl-8 bg-background"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              <Select value={roleFilter} onValueChange={(val: any) => setRoleFilter(val)}>
                  <SelectTrigger className="w-[150px] bg-background">
                      <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="Administrator">Administrator</SelectItem>
                      <SelectItem value="Organizer">Organizer</SelectItem>
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
              Found {filteredAndSortedUsers.length} users
          </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => toggleSort('name')} className="-ml-3 h-8">
                    User
                    <SortIcon columnKey="name" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => toggleSort('role')} className="-ml-3 h-8">
                    Role
                    <SortIcon columnKey="role" />
                </Button>
              </TableHead>
              <TableHead>Event Access</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedUsers.length > 0 ? (
              filteredAndSortedUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'Administrator' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.assignedEvents.map(event => (
                        <Badge key={event} variant="outline" className="font-normal">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" asChild>
                              <Link href={`/admin/users/${user.id}/edit`}>
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Edit User</span>
                              </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit User</p>
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
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => openDeleteDialog(user.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        {isFiltered ? "No users match your filters." : "No users found."}
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
              This action cannot be undone. This will permanently delete the user.
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
