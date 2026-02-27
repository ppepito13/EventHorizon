/**
 * @fileOverview Dynamic Event Registration Form.
 * This component acts as a "Form Engine" that consumes metadata defined by the administrator
 * and renders a type-safe, validated form using React Hook Form and Zod.
 *
 * Business logic:
 * - Automatically generates a Zod schema based on the event's formFields.
 * - Handles both online and on-site events (QR code generation for physical presence).
 * - Implements atomic writes to Firestore (QR reference and Registration document).
 */

'use client';

import type { Event, FormField as FormFieldType, Registration } from '@/lib/types';
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from '@/hooks/use-toast';
import { registerForEvent } from '@/app/actions';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Textarea } from './ui/textarea';
import QRCode from 'qrcode';
import Image from 'next/image';
import { useFirestore } from '@/firebase/provider';
import { doc, writeBatch } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Factory function to create a dynamic Zod validation schema.
 * Map's internal business types (tel, email, dropdown) to strict validation rules.
 * 
 * @param {FormFieldType[]} fields - Metadata defining the form structure.
 * @returns {z.ZodObject}
 */
const generateSchema = (fields: FormFieldType[]) => {
  const schemaFields = fields.reduce(
    (acc, field) => {
      let zodType: z.ZodTypeAny;

      switch (field.type) {
        case 'email':
          zodType = z.string().email({ message: 'Please enter a valid email.' });
          break;
        case 'tel':
            zodType = z.string()
              .refine(val => val.length === 0 || val.length >= 7, {
                  message: "Phone number is too short.",
              })
              .refine(val => val.length === 0 || /^[\d\s+()-]+$/.test(val), {
                  message: "Phone number can only contain digits, spaces, and characters like + ( ) -",
              });
            break;
        case 'checkbox':
            zodType = z.boolean();
            break;
        case 'radio':
        case 'dropdown':
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

      // Application of mandatory requirements
      if (field.required) {
        if (zodType instanceof z.ZodString) {
            zodType = zodType.min(1, { message: `${field.label} is required.` });
        } else if (zodType instanceof z.ZodArray) {
            zodType = zodType.min(1, { message: `Please select at least one option for ${field.label}.` });
        } else if (zodType instanceof z.ZodBoolean && field.type === 'checkbox') {
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

  // GDPR is globally mandatory for all registrations.
  schemaFields['gdpr'] = z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions.',
  });

  return z.object(schemaFields);
};

interface EventRegistrationFormProps {
  event: Event;
}

export function EventRegistrationForm({ event }: EventRegistrationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [successfulRegistration, setSuccessfulRegistration] = useState<Registration | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const firestore = useFirestore();

  const formSchema = generateSchema(event.formFields);
  
  // Initialization of default values to ensure React components are controlled from the start.
  const defaultValues = event.formFields.reduce((acc, field) => {
      if (field.type === 'multiple-choice') {
          acc[field.name] = [];
      } else if (field.type === 'checkbox') {
          acc[field.name] = false;
      }
      else {
        acc[field.name] = '';
      }
      return acc;
  }, {} as { [key: string]: any });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  /**
   * Final submission handler.
   * Performs data persistence and triggers the email subsystem.
   */
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    const registrationTime = new Date();
    const qrId = `qr_${crypto.randomUUID()}`;
    const registrationId = `reg_${crypto.randomUUID()}`;
    
    const isOnSite = event.location.types.includes('On-site');

    try {
        if (!firestore) {
          throw new Error("Firestore is not initialized.");
        }
        
        // We use a Batch Write to ensure either both (QR and Registration) are saved, or neither.
        const batch = writeBatch(firestore);

        // QR Code entry for the scanner module
        const qrCodeData = {
            eventId: event.id,
            eventName: event.name,
            formData: values,
            registrationDate: registrationTime.toISOString(),
        };
        const qrDocRef = doc(firestore, 'qrcodes', qrId);
        batch.set(qrDocRef, qrCodeData);

        // Detailed registration for the organizer dashboard
        const registrationToSave = {
            eventId: event.id,
            eventName: event.name,
            formData: values,
            qrId: qrId,
            registrationDate: registrationTime.toISOString(),
            // Denormalized fields for secure administrative filtering via firestore.rules
            eventOwnerId: event.ownerId,
            eventMembers: event.members,
            checkedIn: false,
            checkInTime: null,
            isApproved: !event.requiresApproval,
        };
        const registrationDocRef = doc(firestore, `events/${event.id}/registrations/${registrationId}`);
        batch.set(registrationDocRef, registrationToSave);
        
        await batch.commit();
        
        // Generate the visual QR code only if it's a physical event.
        let generatedQrUrl: string | undefined = undefined;
        if (isOnSite) {
            generatedQrUrl = await QRCode.toDataURL(qrId, { errorCorrectionLevel: 'H', width: 256 });
        }
        
        // Internal heuristic: we assume fields with 'email' or 'name' in their ID are the primary contacts.
        const emailPayload = {
          email: (values as any).email,
          fullName: (values as any).full_name,
        };

        const emailResult = await registerForEvent(
            { name: event.name, date: event.date }, 
            emailPayload,
            generatedQrUrl,
            event.requiresApproval
        );
        
        setIsLoading(false);
        setSuccessfulRegistration({ id: registrationId, ...registrationToSave });
        setQrCodeDataUrl(generatedQrUrl);

        if (emailResult.emailStatus === 'failed') {
             toast({
                title: 'Email Sending Issue',
                description: 'Your registration was successful, but we could not send the confirmation email. Please contact us.',
                variant: 'default',
                duration: 10000,
            });
        }
    } catch (error) {
        setIsLoading(false);
        console.error("Registration failed:", error);
        const message = error instanceof Error ? error.message : 'An unknown server error occurred.';
        toast({
            variant: "destructive",
            title: "Registration Failed",
            description: message,
        });
    }
  }

  /**
   * Field Factory: Maps metadata field types to specific UI components.
   */
  const renderFormControl = (
    field: FormFieldType,
    formField: any
  ) => {
    const cleanedOptions = field.options?.map(opt => opt.trim()).filter(Boolean) || [];
    switch (field.type) {
      case 'checkbox':
        return (
            <div className="flex items-center space-x-2">
                <Checkbox id={field.name} checked={formField.value} onCheckedChange={formField.onChange} />
                <label htmlFor={field.name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {field.label}
                    {field.required && <span className="text-destructive"> *</span>}
                </label>
            </div>
        );
      case 'textarea':
        return <Textarea placeholder={field.placeholder} {...formField} className="bg-input/70" />;
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
      case 'dropdown':
        return (
            <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                <FormControl>
                    <SelectTrigger className="bg-input/70">
                        <SelectValue placeholder={field.placeholder || "Select an option"} />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    {cleanedOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
      case 'radio':
        return (
            <RadioGroup onValueChange={formField.onChange} defaultValue={formField.value} className="flex flex-col space-y-1">
                {cleanedOptions.map(option => (
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
                {cleanedOptions.map(option => (
                    <FormField
                        key={option}
                        control={form.control}
                        name={field.name}
                        render={({ field }) => (
                           <FormItem key={option} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(option)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value || []), option])
                                                : field.onChange((field.value || [])?.filter((value: string) => value !== option))
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
  
  if (successfulRegistration) {
    const isPending = event.requiresApproval && !successfulRegistration.isApproved;

    return (
      <div className="text-center space-y-4">
        <h3 className="text-xl font-bold font-headline">
            {isPending ? 'Application Submitted!' : 'Registration Successful!'}
        </h3>
        <p className="text-muted-foreground">
          {isPending 
            ? 'Your application is pending approval by the organizer. we will send you an email once a decision has been made.'
            : 'Thank you for registering. Details have been sent to your email address.'
          }
        </p>
        
        {qrCodeDataUrl && !isPending && (
            <div className="flex flex-col items-center gap-2 my-4">
                <div className="p-2 bg-white rounded-lg border">
                    <Image src={qrCodeDataUrl} alt="Your QR Code" width={256} height={256} />
                </div>
                <p className="text-xs text-muted-foreground">Show this code at the event entrance.</p>
            </div>
        )}

        <Button onClick={() => {
            setSuccessfulRegistration(null);
            setQrCodeDataUrl(undefined);
            form.reset();
        }}>
          Register Another Person
        </Button>
      </div>
    );
  }

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
                {field.type !== 'checkbox' && <FormLabel>
                    {field.label}
                    {field.required && <span className="text-destructive"> *</span>}
                </FormLabel>}
                <FormControl>{renderFormControl(field, formField)}</FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <FormField
          control={form.control}
          name="gdpr"
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
                  {event.gdprLabel || 'Data Processing Consent'}
                  <span className="text-destructive"> *</span>
                </FormLabel>
                <FormDescription>
                  {event.gdpr}
                </FormDescription>
                {(() => {
                  if (!event.terms?.enabled || !event.terms.text || !event.terms.url) {
                    return null;
                  }

                  const { text, url } = event.terms;
                  const parts = text.split(/[><]/);

                  if (parts.length !== 3) {
                    return <FormDescription className="pt-2">{text}</FormDescription>;
                  }

                  const [before, linkText, after] = parts;

                  return (
                    <FormDescription className="pt-2">
                      {before}
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-primary"
                      >
                        {linkText}
                      </a>
                      {after}
                    </FormDescription>
                  );
                })()}
                 <FormMessage />
              </div>
            </FormItem>
          )}
        />
        
        <p className="text-xs text-muted-foreground">
            * Required field.
        </p>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Processing...' : 'Register'}
        </Button>
      </form>
    </Form>
  );
}
