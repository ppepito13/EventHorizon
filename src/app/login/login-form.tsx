'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase/provider'; 

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TicketPercent, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/lib/types';

interface LoginFormProps {
    demoUsers: User[];
}

export function LoginForm({ demoUsers }: LoginFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Sign in with Firebase on the client
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Get the ID token
      const token = await user.getIdToken();

      // 3. Send token to our backend to create a server-side session file
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Session login failed.');
      }
      
      // 4. If session is created, redirect to admin panel
      router.push('/admin');

    } catch (err: any) {
      console.error(err);
      let errorMessage = 'An unknown error occurred.';
      // Map common Firebase error codes to user-friendly messages
      if (err.code) {
          switch (err.code) {
              case 'auth/user-not-found':
              case 'auth/wrong-password':
              case 'auth/invalid-credential':
                  errorMessage = 'Invalid email or password.';
                  break;
              case 'auth/invalid-email':
                  errorMessage = 'Please enter a valid email address.';
                  break;
              default:
                  errorMessage = 'Login failed. Please check your credentials and try again.';
                  break;
          }
      } else if (err.message) {
          errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
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
        <span className="text-lg font-semibold">Commerzbank Łódź Events</span>
      </Link>
      
      <Card className="w-full max-w-sm shadow-xl">
        <form onSubmit={handleSubmit}>
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
                disabled={isLoading}
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
                disabled={isLoading}
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
      
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-headline">
            Demo Login Credentials
          </CardTitle>
          <CardDescription>
            Use these credentials to log in.
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
