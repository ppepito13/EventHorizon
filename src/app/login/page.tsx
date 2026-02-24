import { getUsers } from '@/lib/data';
import LoginClientPage from './login-client-page';

export default async function LoginPage() {
  const users = await getUsers();
  return <LoginClientPage demoUsers={users} />;
}
