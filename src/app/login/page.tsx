'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TicketPercent, Loader2, AlertCircle } from 'lucide-react';
import { login } from './actions';
import { Alert, AlertDescription } from '@/components/ui/alert';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? 'Logowanie...' : 'Zaloguj się'}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-secondary p-4">
       <Link href="/" className="flex items-center gap-2 absolute top-8 left-8">
        <TicketPercent className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Platforma Rejestracji</span>
      </Link>
      
      <Card className="w-full max-w-sm shadow-xl">
        <form action={formAction}>
          <CardHeader>
            <CardTitle className="text-center text-2xl font-headline">
              Panel Administracyjny
            </CardTitle>
            <CardDescription className="text-center">
              Zaloguj się, aby zarządzać wydarzeniami
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {state?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {state.error}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Adres email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <SubmitButton />
          </CardFooter>
        </form>
      </Card>
      
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-headline">
            Dane do logowania (demo)
          </CardTitle>
          <CardDescription>
            Użyj poniższych danych, by zalogować się na potrzeby prezentacji.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
           <div className="p-3 rounded-md border bg-muted/50">
              <p className="font-semibold">Email: <span className='font-mono'>admin@example.com</span></p>
              <p className="font-semibold mt-1">Hasło: <span className='font-mono'>password</span></p>
           </div>
           <p className='text-xs text-muted-foreground pt-2'>Możesz też użyć kont organizatorów z sekcji "Użytkownicy".</p>
        </CardContent>
      </Card>
    </div>
  );
}
