'use client';

import { useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateDescriptionAction } from '@/app/admin/actions';

interface AiDescriptionGeneratorProps {
  form: UseFormReturn<{ name: string; description: string; [key: string]: any; }, any, undefined>;
}

const aiFormSchema = z.object({
  eventName: z.string().min(1, 'Event name is required.'),
  eventDetails: z.string().min(10, 'Provide some details about the event.'),
  targetAudience: z.string().min(1, 'Target audience is required.'),
  desiredTone: z.string().min(1, 'Tone is required.'),
});

type AiFormValues = z.infer<typeof aiFormSchema>;

export function AiDescriptionGenerator({ form: eventForm }: AiDescriptionGeneratorProps) {
  const [isOpen, setOpen] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const { toast } = useToast();

  const aiForm = useForm<AiFormValues>({
    resolver: zodResolver(aiFormSchema),
    defaultValues: {
      eventName: '',
      eventDetails: '',
      targetAudience: '',
      desiredTone: 'Exciting',
    },
  });

  const handleOpenChange = (open: boolean) => {
    if (open) {
      aiForm.setValue('eventName', eventForm.getValues('name'));
    }
    setOpen(open);
  };
  
  const onSubmit = async (values: AiFormValues) => {
    setLoading(true);
    const result = await generateDescriptionAction(values);
    setLoading(false);
    
    if (result.success && result.description) {
      eventForm.setValue('description', result.description, { shouldValidate: true });
      toast({ title: 'Success', description: 'Description generated and added to the form.' });
      setOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message || 'Could not generate description.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Wand2 className="mr-2 h-4 w-4" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Generate Event Description</DialogTitle>
          <DialogDescription>
            Provide some details and let AI craft a compelling description for your event.
          </DialogDescription>
        </DialogHeader>
        <Form {...aiForm}>
          <form onSubmit={aiForm.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={aiForm.control}
              name="eventName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={aiForm.control}
              name="eventDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Details & Highlights</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., keynote speakers, main topics, unique activities..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={aiForm.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., developers, designers, students" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={aiForm.control}
                name="desiredTone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desired Tone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a tone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Exciting">Exciting</SelectItem>
                        <SelectItem value="Informative">Informative</SelectItem>
                        <SelectItem value="Playful">Playful</SelectItem>
                        <SelectItem value="Exclusive">Exclusive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
