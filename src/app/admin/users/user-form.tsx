
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
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  email: z.string().email('Invalid email address.'),
  role: z.enum(['Administrator', 'Organizer'], { required_error: 'Role is required.' }),
  assignedEvents: z.array(z.string()).default([]),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: User;
  events: Event[];
}

const initialState = {
    success: false,
    message: '',
    errors: {} as Record<string, string[]>,
};

export function UserForm({ user, events }: UserFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  
  const action = user ? updateUserAction.bind(null, user.id) : createUserAction;
  const [state, formAction] = useActionState(action, initialState);
  
  const isEditMode = !!user;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      role: user?.role || 'Organizer',
      assignedEvents: user?.assignedEvents || [],
    },
  });

  const role = form.watch('role');

  useEffect(() => {
    if (state.success) {
      toast({ title: 'Success!', description: state.message || `User has been ${user ? 'updated' : 'created'}.`, duration: 15000 });
      router.push('/admin/users');
    } else if (state.errors && Object.keys(state.errors).length > 0) {
        Object.entries(state.errors).forEach(([field, messages]) => {
            if (field === '_form') {
                toast({
                    variant: 'destructive',
                    title: 'An error occurred',
                    description: messages.join(', '),
                });
                return;
            }
            form.setError(field as keyof UserFormValues, {
                type: 'server',
                message: messages.join(', '),
            });
        });
    }
  }, [state, form, user, toast, router]);

  const onSubmit = (values: UserFormValues) => {
    const formData = new FormData();
    if (values.role === 'Administrator') {
      formData.append('assignedEvents', 'All');
    } else {
        values.assignedEvents.forEach(event => formData.append('assignedEvents', event));
    }
    
    formData.append('name', values.name);
    formData.append('email', values.email);
    formData.append('role', values.role);

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
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
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
              <FormLabel>Email Address *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john.doe@example.com" {...field} />
              </FormControl>
              <FormDescription>
                This will be the user's login. Create an account with this email in Firebase Authentication.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {!isEditMode && (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input 
                  type="password"
                  value="password"
                  disabled
                />
              </FormControl>
               <FormDescription>
                Default password is "password". User can change it after first login.
              </FormDescription>
              <FormMessage />
            </FormItem>
        )}
       
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Administrator">Administrator</SelectItem>
                  <SelectItem value="Organizer">Event Organizer</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {field.value === 'Administrator' ? 'Access to all sections and events.' : 'Access only to assigned events.'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {role === 'Organizer' && (
          <FormField
            control={form.control}
            name="assignedEvents"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel>Assigned Events</FormLabel>
                  <FormDescription>
                    Select events the user will have access to.
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
                Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {user ? 'Save Changes' : 'Add User'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
