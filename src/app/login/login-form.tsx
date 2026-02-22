'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
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
import { TicketPercent, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { createSessionByEmail } from './actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/lib/types';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';


interface LoginFormProps {
    demoUsers: User[];
}

export function LoginForm({ demoUsers }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const auth = useAuth();
  const router = useRouter();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        setError("Email and password are required.");
        return;
    }

    startTransition(async () => {
        try {
            // 1. Sign in with Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // 2. Create server-side session
            if (userCredential.user) {
                const result = await createSessionByEmail(email);
                if (result.success) {
                    // 3. Redirect to admin
                    router.replace('/admin');
                } else {
                    setError(result.error || "Failed to create a server session.");
                }
            }
        } catch (e: any) {
            if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-password') {
                 setError('Invalid email or password.');
            } else {
                 setError('An unexpected error occurred during login.');
                 console.error(e);
            }
        }
    });
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-secondary p-4">
       <Link href="/" className="flex items-center gap-2 absolute top-8 left-8">
        <TicketPercent className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Event Registration Platform</span>
      </Link>
      
      <Card className="w-full max-w-sm shadow-xl">
        <form onSubmit={handleLogin}>
          <CardHeader>
            <CardTitle className="text-center text-2xl font-headline">
              Admin Panel
            </CardTitle>
            <CardDescription className="text-center">
              Log in to manage your events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
            <Button className="w-full" type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Logging in...' : 'Log in'}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-headline">
            Demo Login Credentials
          </CardTitle>
          <CardDescription>
            Use the credentials below for demonstration purposes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
            {demoUsers.map((user, index) => (
                <div key={user.id} className="p-3 rounded-md border bg-muted/50">
                    <div className='flex justify-between items-center mb-2'>
                        <p className='font-bold'>{user.name}</p>
                        <Badge variant={user.role === 'Administrator' ? 'default' : 'secondary'}>
                            {user.role}
                        </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="font-semibold">Email: <span className='font-mono'>{user.email}</span></p>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(user.email, `email-${index}`)}>
                            {copiedKey === `email-${index}` ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </Button>
                    </div>
                    {user.password && (
                        <div className="flex justify-between items-center mt-1">
                            <p className="font-semibold">Password: <span className='font-mono'>{user.password}</span></p>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(user.password!, `password-${index}`)}>
                                {copiedKey === `password-${index}` ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                    )}
                </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
