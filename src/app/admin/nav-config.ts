import { CalendarDays, Users, UserCog, type LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  icon: string;
  label: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/admin', icon: 'CalendarDays', label: 'Wydarzenia' },
  { href: '/admin/registrations', icon: 'Users', label: 'Rejestracje' },
  { href: '/admin/users', icon: 'UserCog', label: 'Użytkownicy' },
];

export const iconMap: { [key: string]: LucideIcon } = {
  CalendarDays,
  Users,
  UserCog,
};
