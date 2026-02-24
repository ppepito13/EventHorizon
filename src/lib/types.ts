export type FormField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'checkbox' | 'textarea' | 'radio' | 'multiple-choice';
  placeholder?: string;
  required: boolean;
  options?: string[];
};

export type Event = {
  id: string;
  name: string;
  slug: string;
  date: string;
  location: {
    types: Array<'Virtual' | 'On-site'>;
    address?: string;
  };
  description: string;
  heroImage: {
    src: string;
    hint: string;
  };
  formFields: FormField[];
  rodo: string;
  isActive: boolean;
  themeColor: string;
  ownerId?: string;
  members?: { [key: string]: string };
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'Administrator' | 'Organizer';
  assignedEvents: string[];
  uid?: string;
};

export type Registration = {
  id: string;
  qrId?: string;
  eventId: string;
  eventName: string;
  registrationDate: string; // ISO string
  formData: { [key: string]: any };
  checkedIn?: boolean;
  checkInTime?: string | null;
};
