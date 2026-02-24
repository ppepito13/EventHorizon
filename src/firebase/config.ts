
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Throw a more descriptive error if the configuration is missing.
// This helps developers to set up their .env.local file correctly.
if (!apiKey || !authDomain || !projectId) {
    const missingVars = [];
    if (!apiKey) missingVars.push('NEXT_PUBLIC_FIREBASE_API_KEY');
    if (!authDomain) missingVars.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
    if (!projectId) missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    
    // This error will be caught by Next.js and displayed on the error page,
    // making it very clear what needs to be done.
    throw new Error(`
        ----------------------------------------------------------------
        Firebase configuration is missing!
        Please ensure you have a .env.local file in the root directory
        with the following variables set:
        
        ${missingVars.map(v => `${v}=YOUR_VALUE`).join('\n')}

        You can find these values in your Firebase project settings.
        After creating or updating the .env.local file, you MUST
        restart the Next.js development server.
        ----------------------------------------------------------------
    `);
}

export const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
};
