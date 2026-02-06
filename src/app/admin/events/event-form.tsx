'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { Event, FormField as FormFieldType } from '@/lib/types';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createEventAction, updateEventAction } from '../actions';
import { Loader2 } from 'lucide-react';

interface EventFormProps {
  event?: Event;
}

const eventFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  date: z.string().min(1, 'Date is required.'),
  location: z.string().min(1, 'Location is required.'),
  description: z.string().min(1, 'Description is required.'),
  rodo: z.string().min(1, 'RODO/Privacy policy is required.'),
  heroImageSrc: z.string().url('Hero image source must be a valid URL.'),
  heroImageHint: z.string().optional(),
  formFields: z.string().refine(
    value => {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed);
      } catch (error) {
        return false;
      }
    },
    { message: 'Form fields must be a valid JSON array.' }
  ),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

const commonFields: FormFieldType[] = [
    { name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'John Doe', required: true },
    { name: 'email', label: 'Email Address', type: 'email', placeholder: 'john.doe@example.com', required: true },
    { name: 'tel', label: 'Phone Number', type: 'tel', placeholder: '+1 234 567 890', required: false },
    { name: 'company', label: 'Company / Organization', type: 'text', placeholder: 'Innovate Inc.', required: false },
    { name: 'teamName', label: 'Team Name', type: 'text', placeholder: 'Power Nappers', required: false },
];

export function EventForm({ event }: EventFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

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
      formFields: event ? JSON.stringify(event.formFields, null, 2) : '[]',
    },
  });

  const formFieldsValue = form.watch('formFields');

  const handleCommonFieldChange = (checked: boolean, fieldConfig: FormFieldType) => {
    let currentFields: FormFieldType[] = [];
    try {
        currentFields = JSON.parse(form.getValues('formFields') || '[]');
        if (!Array.isArray(currentFields)) throw new Error("Not an array");
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Invalid JSON",
            description: "Cannot add/remove common field because the current JSON is malformed. Please fix it first.",
        });
        return;
    }

    let updatedFields;
    if (checked) {
        if (!currentFields.some(f => f.name === fieldConfig.name)) {
            updatedFields = [...currentFields, fieldConfig];
        } else {
            updatedFields = currentFields;
        }
    } else {
        updatedFields = currentFields.filter(f => f.name !== fieldConfig.name);
    }

    form.setValue('formFields', JSON.stringify(updatedFields, null, 2), { shouldValidate: true, shouldDirty: true });
  }

  const onSubmit = (values: EventFormValues) => {
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        formData.append(key, value as string);
      });

      const result = event
        ? await updateEventAction(event.id, formData)
        : await createEventAction(formData);

      if (result.success) {
        toast({ title: 'Success!', description: `Event has been ${event ? 'updated' : 'created'}.` });
        router.push('/admin');
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

  let parsedFields: FormFieldType[] = [];
  let isJsonValid = true;
  try {
    const parsed = JSON.parse(formFieldsValue || '[]');
    if (!Array.isArray(parsed)) {
        isJsonValid = false;
    } else {
        parsedFields = parsed;
    }
  } catch {
    isJsonValid = false;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name</FormLabel>
              <FormControl>
                <Input placeholder="InnovateSphere 2026" {...field} />
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
                <FormLabel>Date</FormLabel>
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
                <FormLabel>Location</FormLabel>
                <FormControl>
                    <Input placeholder="Virtual & Global" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
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
            name="heroImageSrc"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Hero Image URL</FormLabel>
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

        <div className="space-y-2">
            <FormLabel>Common Registration Fields</FormLabel>
            <FormDescription>
                Select common fields to quickly add them to your registration form.
            </FormDescription>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 rounded-lg border p-4">
                {commonFields.map((commonField) => {
                    const isChecked = isJsonValid && parsedFields.some(f => f.name === commonField.name);
                    return (
                        <FormItem key={commonField.name} className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                        handleCommonFieldChange(Boolean(checked), commonField);
                                    }}
                                    disabled={!isJsonValid}
                                />
                            </FormControl>
                            <FormLabel className="font-normal text-sm">
                                {commonField.label}
                            </FormLabel>
                        </FormItem>
                    )
                })}
            </div>
            {!isJsonValid && <p className="text-sm font-medium text-destructive">Checkboxes disabled due to invalid JSON in the editor below.</p>}
        </div>

        <FormField
          control={form.control}
          name="formFields"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registration Form Fields (JSON)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter the form fields as a JSON array"
                  className="font-mono min-h-[200px] text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Define fields as a JSON array. Each field is an object: {"{ name, label, type ('text', 'email', 'checkbox', 'tel'), required (boolean), placeholder? }"}.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="rodo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RODO / Privacy Policy</FormLabel>
              <FormControl>
                <Textarea placeholder="Your privacy policy and terms..." className="min-h-[100px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {event ? 'Update Event' : 'Create Event'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
