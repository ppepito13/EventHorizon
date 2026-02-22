
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { Event, Registration, FormField as FormFieldType } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { updateRegistrationAction } from './actions';
import { Loader2 } from 'lucide-react';

interface RegistrationFormProps {
  event: Event;
  registration: Registration;
}

const generateSchema = (fields: FormFieldType[]) => {
  const schemaFields = fields.reduce(
    (acc, field) => {
      let zodType: z.ZodTypeAny;

      switch (field.type) {
        case 'email':
          zodType = z.string().email({ message: 'Please enter a valid email.' });
          break;
        case 'tel':
          zodType = z.string().regex(/^[\d\s+()-]+$/, {
              message: "Phone number can only contain digits, spaces, and characters like + ( ) -",
          }).optional();
          break;
        case 'checkbox':
          zodType = z.boolean();
          break;
        case 'radio':
          zodType = z.string();
          break;
        case 'multiple-choice':
          zodType = z.array(z.string());
          break;
        case 'textarea':
        default:
          zodType = z.string();
          break;
      }

      if (field.required) {
        if (zodType instanceof z.ZodString) {
          zodType = zodType.min(1, { message: `${field.label} is required.` });
        } else if (zodType instanceof z.ZodArray) {
          zodType = zodType.min(1, { message: `Please select at least one option for ${field.label}.` });
        } else if (zodType instanceof z.ZodBoolean) {
          zodType = zodType.refine((val) => val === true, { message: `You must check this box.` });
        }
      } else {
        zodType = zodType.optional();
      }
      
      acc[field.name] = zodType;
      return acc;
    },
    {} as { [key: string]: z.ZodTypeAny }
  );

  return z.object(schemaFields);
};

export function RegistrationForm({ event, registration }: RegistrationFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const formSchema = generateSchema(event.formFields);
  type RegistrationFormValues = z.infer<typeof formSchema>;

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: registration.formData,
  });

  const onSubmit = (values: RegistrationFormValues) => {
    startTransition(async () => {
      const result = await updateRegistrationAction(event.id, registration.id, values);
      if (result.success) {
        toast({ title: 'Success!', description: 'Registration has been updated.' });
        router.push('/admin/registrations');
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'An unknown error occurred.',
        });
      }
    });
  };

  const renderFormControl = (
    field: FormFieldType,
    formField: any
  ) => {
    switch (field.type) {
      case 'checkbox':
        return (
            <div className="flex items-center space-x-2">
                <Checkbox id={field.name} checked={formField.value} onCheckedChange={formField.onChange} />
                <label htmlFor={field.name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {field.label}
                </label>
            </div>
        );
      case 'textarea':
        return <Textarea placeholder={field.placeholder} {...formField} />;
      case 'email':
      case 'text':
      case 'tel':
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            {...formField}
          />
        );
      case 'radio':
        return (
            <RadioGroup onValueChange={formField.onChange} defaultValue={formField.value} className="flex flex-col space-y-1">
                {field.options?.map(option => (
                    <FormItem key={option} className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                            <RadioGroupItem value={option} />
                        </FormControl>
                        <FormLabel className="font-normal">{option}</FormLabel>
                    </FormItem>
                ))}
            </RadioGroup>
        );
      case 'multiple-choice':
        return (
             <div className="space-y-2">
                {field.options?.map(option => (
                    <FormField
                        key={option}
                        control={form.control}
                        name={field.name as any}
                        render={({ field: multiChoiceField }) => (
                           <FormItem key={option} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={multiChoiceField.value?.includes(option)}
                                        onCheckedChange={(checked) => {
                                            const currentValues = multiChoiceField.value || [];
                                            return checked
                                                ? multiChoiceField.onChange([...currentValues, option])
                                                : multiChoiceField.onChange(currentValues?.filter((value: string) => value !== option))
                                        }}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal">
                                    {option}
                                </FormLabel>
                           </FormItem>
                        )}
                    />
                ))}
             </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {event.formFields.map((field) => (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                    {field.label}
                    {field.required && <span className="text-destructive"> *</span>}
                </FormLabel>
                <FormControl>{renderFormControl(field, formField)}</FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </div>
      </form>
    </Form>
  );
}
