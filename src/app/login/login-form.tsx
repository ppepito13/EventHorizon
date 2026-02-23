'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TicketPercent, Loader2, AlertCircle, Copy, Check, Server } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/lib/types';

export interface SeedResult {
  success: boolean;
  message: string;
}

interface LoginFormProps {
    demoUsers: User[];
    seedResult: SeedResult;
}

export function LoginForm({ demoUsers, seedResult }: LoginFormProps) {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (seedResult) {
      if (seedResult.success) {
        toast({
          title: 'System Ready',
          description: seedResult.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'System Initializaton Failed',
          description: "Could not sync demo users. See status for details.",
        });
      }
    }
  }, [seedResult, toast]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!auth) {
        setError("Firebase Auth is not available. Please try again later.");
        setIsLoading(false);
        return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdToken();

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Session creation failed.');
      }

      router.push('/admin');
      router.refresh();

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          setError('Invalid credentials. Please check the System Status below.');
      } else {
          setError(err.message || 'An unexpected error occurred.');
      }
      setIsLoading(false);
    }
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Logging in...' : 'Log in'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 font-headline">
            <Server className="w-5 h-5" />
            System Status
          </CardTitle>
          <CardDescription>
            This panel shows the result of the automatic demo user synchronization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {seedResult.success ? (
            <Alert variant="default" className="border-green-500 text-green-700">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{seedResult.message}</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTitle>Seeding Failed</AlertTitle>
              <AlertDescription className="break-words">{seedResult.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-headline">
            Demo Login Credentials
          </CardTitle>
          <CardDescription>
            Use these credentials after the system status is successful.
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
