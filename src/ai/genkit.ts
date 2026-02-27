
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * @fileOverview AI Infrastructure Configuration.
 * 
 * This file initializes Genkit with the Google Generative AI plugin.
 * We use 'gemini-2.5-flash' as the default model due to its high speed 
 * and efficiency for content generation tasks like event descriptions.
 * 
 * TODO: Move configuration settings (e.g., safetySettings) to a centralized 
 * config file to allow for easier tuning across different flows.
 */

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
