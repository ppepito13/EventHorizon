
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
  password: z.string().optional(),
  role: z.enum(['Administrator', 'Organizer'], { required_error: 'Role is required.' }),
  assignedEvents: z.array(z.string()).default([]),
  changePassword: z.boolean().default(false),
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
  
  const isEditMode = !!user;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema.superRefine((data, ctx) => {
        if (isEditMode) { // We are editing a user
            if (data.changePassword && (!data.password || data.password.length < 6)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['password'],
                    message: 'New password must be at least 6 characters.'
                });
            }
        } else { // We are creating a new user
            if (!data.password || data.password.length < 6) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['password'],
                    message: 'Password must be at least 6 characters.'
                });
            }
        }
    })),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      password: '',
      role: user?.role || 'Organizer',
      assignedEvents: user?.assignedEvents || [],
      changePassword: false,
    },
  });

  const role = form.watch('role');
  const changePassword = form.watch('changePassword');

  useEffect(() => {
    if (state.success) {
      toast({ title: 'Success!', description: `User has been ${user ? 'updated' : 'created'}.` });
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
    if (values.changePassword) {
      formData.append('changePassword', 'on');
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
              <FormMessage />
            </FormItem>
          )}
        />
        
        {isEditMode && (
          <FormField
            control={form.control}
            name="changePassword"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="change-password-checkbox"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel htmlFor="change-password-checkbox" className="cursor-pointer">
                    Change Password
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  {...field} 
                  value={field.value ?? ''}
                  disabled={isEditMode && !changePassword}
                  placeholder={isEditMode && !changePassword ? "Password unchanged" : ""}
                />
              </FormControl>
               <FormDescription>
                {isEditMode ? 'Check the box above to enable password change.' : 'Password must be at least 6 characters.'}
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
