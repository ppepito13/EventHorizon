export type FormField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'checkbox' | 'textarea';
  placeholder?: string;
  required: boolean;
};

export type Event = {
  id: string;
  name: string;
  slug: string;
  date: string;
  location: string;
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
  role: 'Administrator' | 'Organizator';
  assignedEvents: string[];
  password?: string;
};
