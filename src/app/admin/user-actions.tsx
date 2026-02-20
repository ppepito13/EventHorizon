'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function UserActions() {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    toast({
        title: 'Wylogowano',
        description: 'Zostałeś pomyślnie wylogowany.',
    });
    router.push('/login');
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href="/">
          <Home className="h-4 w-4 mr-2" />
          Strona główna
        </Link>
      </Button>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" />
        Wyloguj
      </Button>
    </div>
  );
}
