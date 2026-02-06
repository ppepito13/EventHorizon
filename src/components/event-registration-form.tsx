'use client';

import type { Event, FormField as FormFieldType } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { registerForEvent } from '@/app/actions';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface EventRegistrationFormProps {
  event: Event;
}

// Helper to generate Zod schema dynamically
const generateSchema = (fields: FormFieldType[]) => {
  const schemaFields = fields.reduce(
    (acc, field) => {
      let zodType: z.ZodTypeAny;

      switch (field.type) {
        case 'email':
          zodType = z.string().email({ message: 'Please enter a valid email.' });
          break;
        case 'checkbox':
            zodType = z.boolean();
            break;
        default:
          zodType = z.string();
          break;
      }

      if (field.required) {
        if (field.type === 'text') {
            zodType = zodType.min(2, { message: `${field.label} must be at least 2 characters.` });
        }
        if (field.type === 'checkbox') {
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

  schemaFields['rodo'] = z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions.',
  });

  return z.object(schemaFields);
};

export function EventRegistrationForm({ event }: EventRegistrationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const formSchema = generateSchema(event.formFields);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: event.formFields.reduce((acc, field) => ({...acc, [field.name]: ''}), {})
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const result = await registerForEvent(event.id, values);
    setIsLoading(false);

    if (result.success) {
      toast({
        title: 'Registration Successful!',
        description: "We've received your registration. Check your email for details.",
      });
      form.reset();
    } else {
        const errors = result.errors;
        if(errors){
            Object.keys(errors).forEach((field) => {
                if (field !== '_form' && errors[field as keyof typeof errors]) {
                    form.setError(field as any, {
                        type: 'server',
                        message: errors[field as keyof typeof errors]!.join(', '),
                    });
                }
            });
        }

      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: errors?._form?.join(', ') || 'Please check the form for errors and try again.',
      });
    }
  }

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
      case 'email':
      case 'text':
      case 'tel':
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            {...formField}
            className="bg-input/70"
          />
        );
      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {event.formFields.map((field) => (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                {field.type !== 'checkbox' && <FormLabel>{field.label}</FormLabel>}
                <FormControl>{renderFormControl(field, formField)}</FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <FormField
          control={form.control}
          name="rodo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-background">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Agree to terms and conditions
                </FormLabel>
                <FormDescription>
                  {event.rodo}
                </FormDescription>
                 <FormMessage />
              </div>
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Processing...' : 'Register for Free'}
        </Button>
      </form>
    </Form>
  );
}
