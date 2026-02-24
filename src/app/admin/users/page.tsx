import { UsersClientPage } from './users-client-page';
import { getUsers } from '@/lib/data';

export default async function UsersPage() {
  const users = await getUsers();

  return <UsersClientPage initialUsers={users} />;
}
