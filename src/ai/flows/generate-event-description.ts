'use server';

/**
 * @fileOverview Generates event descriptions and promotional copy using AI.
 * 
 * - generateEventDescription - A function that generates an event description.
 * - GenerateEventDescriptionInput - The input type for the generateEventDescription function.
 * - GenerateEventDescriptionOutput - The return type for the generateEventDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateEventDescriptionInputSchema = z.object({
  eventName: z.string().describe('The name of the event.'),
  eventDetails: z.string().describe('Detailed information about the event.'),
  targetAudience: z.string().describe('The target audience for the event.'),
  desiredTone: z
    .string()
    .describe(
      'The desired tone of the description (e.g., professional, exciting, informative).'
    ),
});
export type GenerateEventDescriptionInput = z.infer<typeof GenerateEventDescriptionInputSchema>;

const GenerateEventDescriptionOutputSchema = z.object({
  description: z.string().describe('The generated event description.'),
});
export type GenerateEventDescriptionOutput = z.infer<typeof GenerateEventDescriptionOutputSchema>;

export async function generateEventDescription(
  input: GenerateEventDescriptionInput
): Promise<GenerateEventDescriptionOutput> {
  return generateEventDescriptionFlow(input);
}

const generateEventDescriptionPrompt = ai.definePrompt({
  name: 'generateEventDescriptionPrompt',
  input: {schema: GenerateEventDescriptionInputSchema},
  output: {schema: GenerateEventDescriptionOutputSchema},
  prompt: `You are an AI assistant helping an event organizer generate engaging event descriptions.

  Based on the following event details, generate a compelling description for the event.

  Event Name: {{{eventName}}}
  Event Details: {{{eventDetails}}}
  Target Audience: {{{targetAudience}}}
  Desired Tone: {{{desiredTone}}}
  `,
});

const generateEventDescriptionFlow = ai.defineFlow(
  {
    name: 'generateEventDescriptionFlow',
    inputSchema: GenerateEventDescriptionInputSchema,
    outputSchema: GenerateEventDescriptionOutputSchema,
  },
  async input => {
    const {output} = await generateEventDescriptionPrompt(input);
    return output!;
  }
);
