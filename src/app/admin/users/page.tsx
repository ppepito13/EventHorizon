
import { getUsers } from '@/lib/data';
import { UsersClientPage } from './users-client-page';

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <UsersClientPage initialUsers={users} />
  );
}
