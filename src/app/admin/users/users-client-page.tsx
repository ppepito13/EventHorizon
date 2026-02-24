
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Trash2 } from 'lucide-react';
import { UsersTable } from './users-table';
import Link from 'next/link';
import { useAppSettings } from '@/context/app-settings-provider';
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
import { useState, useTransition } from 'react';
import type { Event, User } from '@/lib/types';
import { generateUsersAction, purgeUsersAction } from './actions';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';

interface UsersClientPageProps {
    initialUsers: User[];
}

export function UsersClientPage({ initialUsers }: UsersClientPageProps) {
  const { showTestDataButtons } = useAppSettings();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isGenerating, startGeneratingTransition] = useTransition();
  const [isPurging, startPurgeTransition] = useTransition();

  const [isPurgeAlertOpen, setPurgeAlertOpen] = useState(false);
  const [isGenerateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generationCount, setGenerationCount] = useState(5);
  
  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events')) : null, [firestore]);
  const { data: events, isLoading: areEventsLoading } = useCollection<Event>(eventsQuery);

  const handleGenerateUsers = () => {
    if (!generationCount || generationCount <= 0 || generationCount > 50) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: 'Please enter a number between 1 and 50.' });
      return;
    }
    
    if (areEventsLoading) {
      toast({ variant: 'destructive', title: 'Please wait', description: 'Events are still loading. Please try again in a moment.' });
      return;
    }
    
    if (!events || events.length === 0) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: 'Cannot generate users because no events exist. Please create an event first.' });
      return;
    }

    startGeneratingTransition(async () => {
      setGenerateDialogOpen(false);
      const result = await generateUsersAction(generationCount, events);
      if (result.success) {
        toast({ title: 'Success', description: result.message, duration: 10000 });
      } else {
        toast({ variant: 'destructive', title: 'Generation Failed', description: result.message || 'An unknown error occurred.' });
      }
    });
  };

  const handlePurgeUsers = () => {
    startPurgeTransition(async () => {
      const result = await purgeUsersAction();
      if (result.success) {
        toast({ title: 'Success', description: result.message, duration: 10000 });
      } else {
        toast({ variant: 'destructive', title: 'Purge Failed', description: result.message || 'An unknown error occurred.' });
      }
      setPurgeAlertOpen(false);
    });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage users and their permissions.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
            <Button asChild>
            <Link href="/admin/users/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add User
            </Link>
            </Button>
             {showTestDataButtons && (
                <>
                    <Button onClick={() => setGenerateDialogOpen(true)} disabled={isGenerating || isPurging || areEventsLoading} variant="outline">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (areEventsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null)}
                        Generate Test Users
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => setPurgeAlertOpen(true)}
                        disabled={isPurging || isGenerating}
                    >
                        {isPurging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Purge Users
                    </Button>
                </>
            )}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View, edit, and delete system users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable users={initialUsers} />
        </CardContent>
      </Card>
      
      <AlertDialog open={isPurgeAlertOpen} onOpenChange={setPurgeAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL users except for accounts with the 'Administrator' role from the application database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPurging}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurgeUsers} disabled={isPurging} className="bg-destructive hover:bg-destructive/90">
              {isPurging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Purge Users
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isGenerateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Generate Test Users</DialogTitle>
                <DialogDescription>
                    How many test users (Organizers) would you like to create?
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
                e.preventDefault();
                handleGenerateUsers();
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
                            max="50"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isGenerating || areEventsLoading}>
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
