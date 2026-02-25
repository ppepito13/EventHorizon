
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

// Helper to generate Zod schema dynamically
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

  schemaFields['rodo'] = z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions.',
  });

  return z.object(schemaFields);
};

export function EventRegistrationForm({ event }: EventRegistrationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [successfulRegistration, setSuccessfulRegistration] = useState<Registration | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const { toast } = useToast();
  const firestore = useFirestore();

  const formSchema = generateSchema(event.formFields);
  
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    const registrationTime = new Date();
    const qrId = `qr_${crypto.randomUUID()}`;
    const registrationId = `reg_${crypto.randomUUID()}`;
    
    try {
        const batch = writeBatch(firestore);

        const qrCodeData = {
            eventId: event.id,
            eventName: event.name,
            formData: values,
            registrationDate: registrationTime.toISOString(),
        };
        const qrDocRef = doc(firestore, 'qrcodes', qrId);
        batch.set(qrDocRef, qrCodeData);

        const registrationToSave = {
            eventId: event.id,
            eventName: event.name,
            formData: values,
            qrId: qrId,
            registrationDate: registrationTime.toISOString(),
            eventOwnerId: event.ownerId,
            eventMembers: event.members,
            checkedIn: false,
            checkInTime: null,
        };
        const registrationDocRef = doc(firestore, `events/${event.id}/registrations/${registrationId}`);
        batch.set(registrationDocRef, registrationToSave);
        
        await batch.commit();
        
        // After successful DB write, generate QR and send email
        const generatedQrUrl = await QRCode.toDataURL(qrId, { errorCorrectionLevel: 'H', width: 256 });
        
        const emailPayload = {
          email: (values as any).email,
          fullName: (values as any).full_name,
        };

        const emailResult = await registerForEvent(
            { name: event.name, date: event.date }, 
            emailPayload,
            generatedQrUrl
        );
        
        setIsLoading(false);
        setSuccessfulRegistration({ id: registrationId, ...registrationToSave });
        setQrCodeDataUrl(generatedQrUrl);

        if (emailResult.emailStatus === 'failed') {
             toast({
                title: 'Problem z wysyłką e-maila',
                description: 'Twoja rejestracja przebiegła pomyślnie, ale nie udało nam się wysłać potwierdzenia. Prosimy, zachowaj widoczny kod QR.',
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
  
  if (successfulRegistration && qrCodeDataUrl) {
    return (
      <div className="text-center space-y-4">
        <h3 className="text-xl font-bold font-headline">Registration Successful!</h3>
        <p className="text-muted-foreground">
          Thank you for registering. Please save this unique QR code for check-in.
        </p>
        <div className="flex justify-center my-4">
            <Image src={qrCodeDataUrl} alt="Your QR Code" width={256} height={256} className="rounded-lg border p-2 bg-white" />
        </div>
        <Button onClick={() => {
            setSuccessfulRegistration(null);
            setQrCodeDataUrl('');
            form.reset();
        }}>
          Register another person
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
                  <span className="text-destructive"> *</span>
                </FormLabel>
                <FormDescription>
                  {event.rodo}
                </FormDescription>
                 <FormMessage />
              </div>
            </FormItem>
          )}
        />
        
        <p className="text-xs text-muted-foreground">
            * Indicates a required field.
        </p>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Processing...' : 'Register for Free'}
        </Button>
      </form>
    </Form>
  );
}
