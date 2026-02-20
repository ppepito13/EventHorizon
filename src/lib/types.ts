export type FormField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'checkbox';
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
