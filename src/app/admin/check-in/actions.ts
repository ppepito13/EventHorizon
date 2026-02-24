
'use server';

// All check-in actions have been moved to `src/app/admin/check-in/check-in-client-page.tsx`.
// This was necessary because the server environment for actions lacks the necessary
// Firebase Admin credentials, causing authentication errors.
// By moving the logic to the client component, we can use the client-side
// Firebase SDK, which operates under the currently authenticated user's permissions.
// This file is kept to avoid breaking imports but is now empty of logic.
