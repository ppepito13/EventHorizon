import { getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (user?.role !== 'Administrator') {
    redirect('/admin');
  }

  return <>{children}</>;
}
