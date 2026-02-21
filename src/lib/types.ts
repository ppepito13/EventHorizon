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
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'Administrator' | 'Organizer';
  assignedEvents: string[];
  password?: string;
};
