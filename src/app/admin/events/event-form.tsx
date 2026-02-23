'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { Event } from '@/lib/types';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createEventAction, updateEventAction } from '../actions';
import { Loader2, PlusCircle, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DateInput } from '@/components/ui/date-input';


interface EventFormProps {
  event?: Event;
}

const formFieldSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  label: z.string().min(1, 'Label is required.'),
  type: z.enum(['text', 'email', 'tel', 'checkbox', 'textarea', 'radio', 'multiple-choice']),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

const dateStringSchema = z.string()
  .regex(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, {
    message: "Please use DD/MM/YYYY format.",
  })
  .refine((val) => {
    const [day, month, year] = val.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    // Check if the constructed date is valid and matches the input parts
    return date && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }, {
    message: "Please enter a valid date."
  });

const eventFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  dateType: z.enum(['single', 'range']).default('single'),
  startDate: dateStringSchema,
  endDate: z.string().optional(),
  allowPastDates: z.boolean().default(false),
  locationTypes: z.array(z.string()).nonempty({ message: 'Please select at least one event format.' }),
  locationAddress: z.string().optional(),
  description: z.string().min(1, 'Description is required.'),
  rodo: z.string().min(1, 'Privacy Policy is required.'),
  heroImageSrc: z.string().url('Hero image source must be a valid URL.'),
  heroImageHint: z.string().optional(),
  formFields: z.array(formFieldSchema),
  isActive: z.boolean(),
}).superRefine((data, ctx) => {
  // If location is On-site, address is required
  if (data.locationTypes.includes('On-site') && (!data.locationAddress || data.locationAddress.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Address is required for on-site events.',
      path: ['locationAddress'],
    });
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  // Past date validation
  if (!data.allowPastDates) {
      const startParseResult = dateStringSchema.safeParse(data.startDate);
      if (startParseResult.success) {
          const startDateObj = parseDate(startParseResult.data);
          if (startDateObj < today) {
              ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Start date cannot be in the past.",
                  path: ['startDate'],
              });
          }
      }
  }

  // If date type is range, handle end date
  if (data.dateType === 'range') {
    if (!data.endDate || data.endDate.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date is required for a date range.',
        path: ['endDate'],
      });
    } else {
      const endParseResult = dateStringSchema.safeParse(data.endDate);
      if (!endParseResult.success) {
        endParseResult.error.errors.forEach(error => {
            ctx.addIssue({ ...error, path: ['endDate'] });
        });
      } else {
        // End date after start date validation
        const startParseResult = dateStringSchema.safeParse(data.startDate);
        if (startParseResult.success) {
          const startDateObj = parseDate(startParseResult.data);
          const endDateObj = parseDate(endParseResult.data);
          if (startDateObj > endDateObj) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'End date cannot be before start date.',
              path: ['endDate'],
            });
          }
        }
        // Past date validation for end date
        if (!data.allowPastDates) {
            const endDateObj = parseDate(endParseResult.data);
            if (endDateObj < today) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "End date cannot be in the past.",
                    path: ['endDate'],
                });
            }
        }
      }
    }
  }
});


type EventFormValues = z.infer<typeof eventFormSchema>;

export function EventForm({ event }: EventFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const dateParts = event?.date?.split(' - ') ?? [];
  const isRange = dateParts.length > 1;

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: event?.name || '',
      dateType: isRange ? 'range' : 'single',
      startDate: event ? (isRange ? dateParts[0] : event.date) : '',
      endDate: event && isRange ? dateParts[1] : '',
      allowPastDates: false,
      locationTypes: event?.location.types || [],
      locationAddress: event?.location.address || '',
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
  
  const watchedLocationTypes = form.watch('locationTypes');
  const dateType = form.watch('dateType');

  const onSubmit = (values: EventFormValues) => {
    startTransition(async () => {
      const { dateType, startDate, endDate, locationTypes, locationAddress, ...restOfValues } = values;
      const dateString = dateType === 'range' && endDate ? `${startDate} - ${endDate}` : startDate;
      
      const submissionData = {
        ...restOfValues,
        date: dateString,
        location: JSON.stringify({ types: locationTypes, address: locationAddress }),
        formFields: JSON.stringify(values.formFields, null, 2),
        isActive: String(values.isActive),
        heroImageSrc: values.heroImageSrc,
        heroImageHint: values.heroImageHint || '',
      };

      const formData = new FormData();
      Object.entries(submissionData).forEach(([key, value]) => {
        formData.append(key, value as string);
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
              name="dateType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Date Type *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="single" />
                        </FormControl>
                        <FormLabel className="font-normal">Single-day event</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="range" />
                        </FormControl>
                        <FormLabel className="font-normal">Multi-day event</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
                {dateType === 'single' ? (
                     <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                  Event Date *
                                  <span className="text-muted-foreground font-normal ml-2">(DD/MM/YYYY)</span>
                                </FormLabel>
                                <FormControl>
                                    <DateInput value={field.value} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                      Start Date *
                                      <span className="text-muted-foreground font-normal ml-2">(DD/MM/YYYY)</span>
                                    </FormLabel>
                                    <FormControl>
                                        <DateInput value={field.value} onChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                      End Date *
                                      <span className="text-muted-foreground font-normal ml-2">(DD/MM/YYYY)</span>
                                    </FormLabel>
                                    <FormControl>
                                        <DateInput value={field.value} onChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <FormField
                control={form.control}
                name="allowPastDates"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                      <FormControl>
                          <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                          <FormLabel>Allow Past Dates</FormLabel>
                          <FormDescription>
                              Allow setting an event date that is in the past.
                          </FormDescription>
                      </div>
                  </FormItem>
                )}
              />
            </div>


            <FormField
              control={form.control}
              name="locationTypes"
              render={() => (
                <FormItem>
                  <FormLabel>Event Format *</FormLabel>
                  <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <FormField
                      control={form.control}
                      name="locationTypes"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes('Virtual')}
                              onCheckedChange={(checked) => {
                                const currentValue = field.value || [];
                                return checked
                                  ? field.onChange([...currentValue, 'Virtual'])
                                  : field.onChange(currentValue?.filter((value) => value !== 'Virtual'));
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Virtual
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="locationTypes"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes('On-site')}
                              onCheckedChange={(checked) => {
                                const currentValue = field.value || [];
                                return checked
                                  ? field.onChange([...currentValue, 'On-site'])
                                  : field.onChange(currentValue?.filter((value) => value !== 'On-site'));
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            On-site
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

        </div>
        
        {watchedLocationTypes?.includes('On-site') && (
            <FormField
                control={form.control}
                name="locationAddress"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>On-site Event Address *</FormLabel>
                        <FormControl><Input placeholder="Wersalska 6, 91-203 Łódź" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        )}
        
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
            control={form.control}
            name="heroImageSrc"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Hero Image URL *</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Input placeholder="https://picsum.photos/seed/event/1200/800" {...field} />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: 'Upload Mockup',
                          description: "Here, you'd select a file to upload.",
                        });
                      }}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                  </div>
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
                <CardTitle>Registration Form Fields</CardTitle>
                <CardDescription>Define what data will be collected from attendees.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-4">
                    {fields.map((field, index) => (
                       <FormFieldCard key={field.id} index={index} remove={remove} form={form} />
                    ))}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ name: `field_${fields.length}`, label: '', type: 'text', placeholder: '', required: false, options: [] })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Field
                </Button>
            </CardContent>
        </Card>

         <FormField
          control={form.control}
          name="rodo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Privacy Policy / GDPR *</FormLabel>
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
                <FormLabel>Event Active</FormLabel>
                <FormDescription>
                  Make the event page public.
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
                Cancel
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


function FormFieldCard({ index, remove, form }: { index: number, remove: (index: number) => void, form: any }) {
    const { fields: options, append: appendOption, remove: removeOption } = useFieldArray({
        control: form.control,
        name: `formFields.${index}.options`,
    });

    const fieldType = form.watch(`formFields.${index}.type`);

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
    
    return (
        <Card className="p-4 relative bg-secondary/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name={`formFields.${index}.label`}
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Label</FormLabel>
                        <FormControl>
                            <Input
                                placeholder="e.g. Full Name"
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
                        <Input placeholder="e.g. John Doe" {...field} />
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
                            <FormLabel className="cursor-pointer">Required</FormLabel>
                        </FormItem>
                    )}
                    />
                    <FormField
                        control={form.control}
                        name={`formFields.${index}.type`}
                        render={({ field }) => (
                            <FormItem>
                                <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    if (value === 'radio' || value === 'multiple-choice') {
                                        // Set default options if not present
                                        const currentOptions = form.getValues(`formFields.${index}.options`);
                                        if (!currentOptions || currentOptions.length === 0) {
                                            form.setValue(`formFields.${index}.options`, ['', '']);
                                        }
                                    }
                                }} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="w-[220px]">
                                            <SelectValue placeholder="Select field type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="text">Text</SelectItem>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="tel">Phone</SelectItem>
                                        <SelectItem value="textarea">Textarea</SelectItem>
                                        <SelectItem value="checkbox">Checkbox (agreement)</SelectItem>
                                        <SelectItem value="radio">Single Choice (Radio)</SelectItem>
                                        <SelectItem value="multiple-choice">Multiple Choice (Checkbox)</SelectItem>
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
            {(fieldType === 'radio' || fieldType === 'multiple-choice') && (
                <div className="mt-4 space-y-3">
                    <FormLabel>Choice Options</FormLabel>
                    {options.map((option, optionIndex) => (
                        <div key={option.id} className="flex items-center gap-2">
                             <FormField
                                control={form.control}
                                name={`formFields.${index}.options.${optionIndex}`}
                                render={({ field }) => (
                                    <Input {...field} placeholder={`Option ${optionIndex + 1}`} />
                                )}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(optionIndex)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendOption('')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Option
                    </Button>
                </div>
            )}
        </Card>
    );
}
