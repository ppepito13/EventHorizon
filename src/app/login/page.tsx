'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { TicketPercent, Loader2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const demoUsers = [
  {
    email: 'admin@example.com',
    password: 'password',
    role: 'Administrator',
  },
  {
    email: 'organizer1@example.com',
    password: 'password',
    role: 'Organizator (Tech Summit)',
  },
  {
    email: 'organizer2@example.com',
    password: 'password',
    role: 'Organizator (Music Fest)',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
      router.replace('/admin');
    } else {
      setIsCheckingAuth(false);
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Placeholder login logic
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (
      demoUsers.some(user => user.email === email && user.password === password)
    ) {
      localStorage.setItem('isLoggedIn', 'true');
      toast({
        title: 'Login Successful',
        description: 'Redirecting to admin panel...',
      });
      router.push('/admin');
    } else {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid email or password. Please try again.',
      });
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Skopiowano!', description: `${text} skopiowano do schowka.` });
  };

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-secondary p-4 py-12">
      <div className="flex items-center gap-2">
        <TicketPercent className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Platforma Rejestracji</span>
      </div>
      
      <Card className="w-full max-w-sm shadow-xl">
        <form onSubmit={handleLogin}>
          <CardHeader>
            <CardTitle className="text-center text-2xl font-headline">
              Panel Administracyjny
            </CardTitle>
            <CardDescription className="text-center">
              Zaloguj się, aby zarządzać wydarzeniami
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adres email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Logowanie...' : 'Zaloguj się'}
            </Button>
            <Button
              variant="link"
              size="sm"
              className="text-muted-foreground"
              asChild
            >
              <Link href="/">Powrót na stronę główną</Link>
            </Button>
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
        <CardContent className="space-y-4 text-sm">
          {demoUsers.map(user => (
            <div
              key={user.email}
              className="p-3 rounded-md border bg-muted/50"
            >
              <p className="font-semibold">{user.role}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-muted-foreground font-mono truncate">
                  Email: {user.email}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => copyToClipboard(user.email)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-mono">
                  Hasło: {user.password}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => copyToClipboard(user.password)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
