import { getUsers } from '@/lib/data';
import type { User } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';

function UserRow({ user }: { user: User }) {
  return (
    <TableRow>
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
      <TableCell className="text-right">
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Użytkownicy</CardTitle>
        <CardDescription>
          Zarządzaj użytkownikami i ich uprawnieniami.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Użytkownik</TableHead>
                <TableHead>Rola</TableHead>
                <TableHead>Dostęp do wydarzeń</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <UserRow key={user.id} user={user} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
