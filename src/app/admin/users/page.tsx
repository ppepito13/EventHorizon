import Link from 'next/link';
import { getUsers } from '@/lib/data';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { UsersTable } from './users-table';

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Użytkownicy</h1>
          <p className="text-muted-foreground">
            Zarządzaj użytkownikami i ich uprawnieniami.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Dodaj użytkownika
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Wszyscy użytkownicy</CardTitle>
          <CardDescription>
            Przeglądaj, edytuj i usuwaj użytkowników systemu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable users={users} />
        </CardContent>
      </Card>
    </>
  );
}
