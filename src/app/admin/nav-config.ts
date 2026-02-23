import { CalendarDays, Users, UserCog, Settings, QrCode, type LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  icon: string;
  label: string;
  adminOnly?: boolean;
  organizerOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/admin', icon: 'CalendarDays', label: 'Events' },
  { href: '/admin/registrations', icon: 'Users', label: 'Registrations' },
  { href: '/admin/check-in', icon: 'QrCode', label: 'Check-In', organizerOnly: true },
  { href: '/admin/users', icon: 'UserCog', label: 'Users', adminOnly: true },
  { href: '/admin/account', icon: 'Settings', label: 'Account Settings', organizerOnly: true },
];

export const iconMap: { [key: string]: LucideIcon } = {
  CalendarDays,
  Users,
  UserCog,
  Settings,
  QrCode,
};
