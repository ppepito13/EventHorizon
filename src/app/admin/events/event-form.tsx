'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { Event, FormField as FormFieldType } from '@/lib/types';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { createEventAction, updateEventAction } from '../actions';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EventFormProps {
  event?: Event;
}

const formFieldSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  label: z.string().min(1, 'Label is required.'),
  type: z.enum(['text', 'email', 'tel', 'checkbox', 'textarea']),
  placeholder: z.string().optional(),
  required: z.boolean(),
});

const eventFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  date: z.string().min(1, 'Date is required.'),
  location: z.string().min(1, 'Location is required.'),
  description: z.string().min(1, 'Description is required.'),
  rodo: z.string().min(1, 'RODO/Privacy policy is required.'),
  heroImageSrc: z.string().url('Hero image source must be a valid URL.'),
  heroImageHint: z.string().optional(),
  formFields: z.array(formFieldSchema),
  isActive: z.boolean(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

const generateFieldName = (label: string) => {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

export function EventForm({ event }: EventFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: event?.name || '',
      date: event?.date || '',
      location: event?.location || '',
      description: event?.description || '',
      rodo: event?.rodo || '',
      heroImageSrc: event?.heroImage.src || '',
      heroImageHint: event?.heroImage.hint || '',
      formFields: event ? (typeof event.formFields === 'string' ? JSON.parse(event.formFields) : event.formFields) : [],
      isActive: event?.isActive || false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "formFields",
  });

  const onSubmit = (values: EventFormValues) => {
    startTransition(async () => {
      const submissionData = {
        ...values,
        formFields: JSON.stringify(values.formFields, null, 2),
        isActive: String(values.isActive),
      };

      const formData = new FormData();
      Object.entries(submissionData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const result = event
        ? await updateEventAction(event.id, formData)
        : await createEventAction(formData);

      if (result.success) {
        toast({ title: 'Success!', description: `Event has been ${event ? 'updated' : 'created'}.` });
        router.push('/admin');
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: (result as { message: string }).message || (result.errors ? 'Please check the form for errors.' : 'An unknown error occurred.'),
        });
        if (result.errors) {
            Object.keys(result.errors).forEach((field) => {
                form.setError(field as keyof EventFormValues, {
                    type: 'server',
                    message: result.errors[field as keyof typeof result.errors]!.join(', '),
                });
            });
        }
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name *</FormLabel>
              <FormControl>
                <Input placeholder="InnovateSphere 2026" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Description *</FormLabel>
                <FormControl>
                    <Textarea placeholder="Describe the event..." className="min-h-[150px]" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl>
                    <Input placeholder="October 26-28, 2026" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Location *</FormLabel>
                <FormControl>
                    <Input placeholder="Virtual &amp; Global" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
            control={form.control}
            name="heroImageSrc"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Hero Image URL *</FormLabel>
                <FormControl>
                    <Input placeholder="https://picsum.photos/seed/event/1200/800" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="heroImageHint"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Hero Image Hint</FormLabel>
                <FormControl>
                    <Input placeholder="conference stage" {...field} />
                </FormControl>
                <FormDescription>
                    AI hint for image search (1-2 keywords).
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Pola formularza rejestracyjnego</CardTitle>
                <CardDescription>Zdefiniuj, jakie dane będą zbierane od uczestników.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <Card key={field.id} className="p-4 relative bg-secondary/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name={`formFields.${index}.label`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Label</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="np. Imię i nazwisko"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    const newName = generateFieldName(e.target.value);
                                                    form.setValue(`formFields.${index}.name`, newName);
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`formFields.${index}.placeholder`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Placeholder</FormLabel>
                                        <FormControl>
                                        <Input placeholder="np. Jan Kowalski" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                  <FormField
                                    control={form.control}
                                    name={`formFields.${index}.required`}
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel className="cursor-pointer">Wymagane</FormLabel>
                                        </FormItem>
                                    )}
                                  />
                                  <FormField
                                      control={form.control}
                                      name={`formFields.${index}.type`}
                                      render={({ field }) => (
                                          <FormItem>
                                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                  <FormControl>
                                                      <SelectTrigger className="w-[180px]">
                                                          <SelectValue placeholder="Select a field type" />
                                                      </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent>
                                                      <SelectItem value="text">Text</SelectItem>
                                                      <SelectItem value="email">Email</SelectItem>
                                                      <SelectItem value="tel">Phone</SelectItem>
                                                      <SelectItem value="textarea">Textarea</SelectItem>
                                                      <SelectItem value="checkbox">Checkbox</SelectItem>
                                                  </SelectContent>
                                              </Select>
                                          </FormItem>
                                      )}
                                  />
                                </div>
                                <div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                        <span className="sr-only">Remove field</span>
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ name: `field_${fields.length}`, label: '', type: 'text', placeholder: '', required: false })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Dodaj pole
                </Button>
            </CardContent>
        </Card>

         <FormField
          control={form.control}
          name="rodo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RODO / Privacy Policy *</FormLabel>
              <FormControl>
                <Textarea placeholder="Your privacy policy and terms..." className="min-h-[100px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Wydarzenie aktywne</FormLabel>
                <FormDescription>
                  Udostępnij stronę wydarzenia publicznie.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />


        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
                Anuluj
            </Button>
            <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {event ? 'Update Event' : 'Create Event'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
