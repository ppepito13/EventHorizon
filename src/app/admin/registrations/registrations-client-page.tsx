'use client';

import { useState, useMemo, useTransition } from 'react';
import type { Event, Registration, User } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RegistrationsTable } from './registrations-table';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { exportRegistrationsAction } from './actions';
import { useToast } from '@/hooks/use-toast';

interface RegistrationsClientPageProps {
  events: Event[];
  registrations: Registration[];
  userRole: User['role'];
}

export function RegistrationsClientPage({ events, registrations, userRole }: RegistrationsClientPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(events[0]?.id);
  const [isExporting, startExportTransition] = useTransition();
  const { toast } = useToast();

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
  };
  
  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);
  
  const filteredRegistrations = useMemo(() => {
    if (!selectedEventId) return [];
    return registrations.filter(r => r.eventId === selectedEventId);
  }, [registrations, selectedEventId]);

  const handleExport = () => {
    if (!selectedEventId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select an event to export.' });
        return;
    }
    startExportTransition(async () => {
        const result = await exportRegistrationsAction(selectedEventId);
        if (result.success && result.csvData) {
            const blob = new Blob([result.csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const safeEventName = result.eventName?.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.setAttribute('download', `registrations_${safeEventName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: 'Success', description: 'Registrations exported successfully.' });
        } else {
            toast({ variant: 'destructive', title: 'Export Failed', description: result.error || 'No registrations to export.' });
        }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrations</CardTitle>
        <CardDescription>
          View and manage event registrations. Select an event to see its attendees.
        </CardDescription>
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Select onValueChange={handleEventChange} defaultValue={selectedEventId}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {events.map(event => (
                <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExport} disabled={isExporting || !selectedEventId || filteredRegistrations.length === 0}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {selectedEvent ? (
          <RegistrationsTable 
            event={selectedEvent} 
            registrations={filteredRegistrations} 
            userRole={userRole}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>{events.length > 0 ? 'Please select an event to view registrations.' : 'No events found.'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
