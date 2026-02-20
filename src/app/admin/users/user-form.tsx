'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useTransition, useActionState } from 'react';
import { useRouter } from 'next/navigation';

import type { Event, User } from '@/lib/types';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createUserAction, updateUserAction } from './actions';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const userFormSchema = z.object({
  name: z.string().min(3, 'Imię i nazwisko musi mieć co najmniej 3 znaki.'),
  email: z.string().email('Nieprawidłowy adres email.'),
  password: z.string().min(6, 'Hasło musi mieć co najmniej 6 znaków.').or(z.literal('')).optional(),
  role: z.enum(['Administrator', 'Organizator'], { required_error: 'Rola jest wymagana.' }),
  assignedEvents: z.array(z.string()).default([]),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: User;
  events: Event[];
}

const initialState = {
    success: false,
    errors: {} as Record<string, string[]>,
};

export function UserForm({ user, events }: UserFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  
  const action = user ? updateUserAction.bind(null, user.id) : createUserAction;
  const [state, formAction] = useActionState(action, initialState);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      password: '',
      role: user?.role || 'Organizator',
      assignedEvents: user?.assignedEvents || [],
    },
  });

  const role = form.watch('role');

  useEffect(() => {
    if (state.success) {
      toast({ title: 'Sukces!', description: `Użytkownik został ${user ? 'zaktualizowany' : 'utworzony'}.` });
      router.push('/admin/users');
      router.refresh();
    } else if (Object.keys(state.errors).length > 0) {
        Object.entries(state.errors).forEach(([field, messages]) => {
            form.setError(field as keyof UserFormValues, {
                type: 'server',
                message: messages.join(', '),
            });
        });
    }
  }, [state, form, user, toast, router]);

  const onSubmit = (values: UserFormValues) => {
    const formData = new FormData();
    // Handle role=Administrator case where assignedEvents should be 'All'
    if (values.role === 'Administrator') {
      formData.append('assignedEvents', 'All');
    } else {
        values.assignedEvents.forEach(event => formData.append('assignedEvents', event));
    }
    
    // Append other values
    formData.append('name', values.name);
    formData.append('email', values.email);
    formData.append('role', values.role);
    if (values.password) {
      formData.append('password', values.password);
    }


    startTransition(() => {
        formAction(formData);
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Imię i nazwisko *</FormLabel>
              <FormControl>
                <Input placeholder="Jan Kowalski" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adres email *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="jan.kowalski@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hasło {user && '(pozostaw puste, aby nie zmieniać)'}</FormLabel>
              <FormControl>
                <Input type="password" {...field} value={field.value ?? ''} />
              </FormControl>
               <FormDescription>
                {user ? 'Wprowadź nowe hasło, aby je zaktualizować.' : 'Hasło musi mieć co najmniej 6 znaków.'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rola *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz rolę" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Administrator">Administrator</SelectItem>
                  <SelectItem value="Organizator">Organizator wydarzenia</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {field.value === 'Administrator' ? 'Dostęp do wszystkich sekcji i wydarzeń.' : 'Dostęp tylko do przypisanych wydarzeń.'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {role === 'Organizator' && (
          <FormField
            control={form.control}
            name="assignedEvents"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel>Przypisane wydarzenia</FormLabel>
                  <FormDescription>
                    Wybierz wydarzenia, do których użytkownik będzie miał dostęp.
                  </FormDescription>
                </div>
                {events.map((event) => (
                  <FormField
                    key={event.id}
                    control={form.control}
                    name="assignedEvents"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={event.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(event.name)}
                              onCheckedChange={(checked) => {
                                const newAssignedEvents = checked
                                  ? [...(field.value || []), event.name]
                                  : (field.value || []).filter(
                                      (value) => value !== event.name
                                    );
                                field.onChange(newAssignedEvents);
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {event.name}
                          </FormLabel>
                        </FormItem>
                      )
                    }}
                  />
                ))}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
                Anuluj
            </Button>
            <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {user ? 'Zapisz zmiany' : 'Dodaj użytkownika'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
