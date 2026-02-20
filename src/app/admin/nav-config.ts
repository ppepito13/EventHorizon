import { CalendarDays, Users, UserCog, Settings, type LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  icon: string;
  label: string;
  adminOnly?: boolean;
  organizerOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/admin', icon: 'CalendarDays', label: 'Wydarzenia' },
  { href: '/admin/registrations', icon: 'Users', label: 'Rejestracje' },
  { href: '/admin/users', icon: 'UserCog', label: 'Użytkownicy', adminOnly: true },
  { href: '/admin/account', icon: 'Settings', label: 'Ustawienia konta', organizerOnly: true },
];

export const iconMap: { [key: string]: LucideIcon } = {
  CalendarDays,
  Users,
  UserCog,
  Settings,
};
