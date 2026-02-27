# Project Technical Documentation: EventHorizon (Commerzbank Lodz Events)

## 1. Project Overview

### Application Purpose
**EventHorizon** is a comprehensive platform for managing corporate and social events, dedicated to Commerzbank Lodz. The application enables dynamic creation of event pages, participant registration using configurable forms, generation of QR codes for fast check-in, and advanced permission management (Administrator vs. Organizer).

### Tech Stack
*   **Framework**: Next.js 15.5.9 (App Router)
*   **Language**: TypeScript
*   **Frontend**: React 19.2.1, Tailwind CSS 3.4.1
*   **UI Components**: shadcn/ui (Radix UI)
*   **Database & Auth**: Firebase SDK 11.9.1 (Firestore, Authentication)
*   **Backend**: Firebase Admin SDK 12.1.0 (Used in Server Actions and API)
*   **AI**: Genkit 1.20.0 (Integration with Google Gemini)
*   **Icons**: Lucide React
*   **Email Service**: Resend SDK

---

## 2. Frontend Architecture

### Routing Structure (`src/app/`)
The project utilizes the **Next.js App Router**. Division of sections:

*   **Public**:
    *   `/`: Home page with a list of active events.
    *   `/events/[slug]`: Dynamic page for a specific event with a registration form.
    *   `/login`: Login page for the administrative panel.
*   **Admin (`/admin/`)**:
    *   `/admin`: Dashboard with an events table.
    *   `/admin/registrations`: Central management of registrations and mass mailing.
    *   `/admin/check-in`: QR code scanner module and manual attendance confirmation.
    *   `/admin/users`: User account management (Administrator only).
    *   `/admin/account`: Profile settings and theme switching.

### Data Access Patterns
The application combines two approaches:
1.  **Client-Side Real-time (Firestore SDK)**: Admin panel tables use `useCollection` and `useDoc` hooks, providing instant data updates without page reloads (e.g., attendance statuses).
2.  **Server Actions**: Used for operations requiring security or external integrations (e.g., sending emails, logging in, manipulating local user files).

---

## 3. Firebase Integration and Backend Logic

### Authentication (Auth)
The login process (`src/app/login/`) is based on **Firebase Authentication**.
*   **Session Management**: After a successful client-side login, the ID token is sent to the `/api/auth/login` endpoint, which verifies it using the Firebase Admin SDK and saves user data in a session (handled by `src/lib/session.ts`).
*   **Providers**: Password (Email/Password) and Anonymous (for testing/public purposes).

### Database (Firestore)
The data structure (`src/lib/types.ts`) is optimized for security and performance:

| Collection | Description | Main Fields |
| :--- | :--- | :--- |
| `events` | Event definitions | `id`, `name`, `slug`, `formFields`, `isActive`, `ownerId`, `members` (role map) |
| `events/{id}/registrations` | Participants of a given event | `id`, `formData` (dynamic), `qrId`, `checkedIn`, `isApproved` |
| `app_admins` | Global administrators | Document ID = User UID (no additional fields) |
| `qrcodes` | Shortened data for the scanner | `eventId`, `qrId`, `registrationDate` |

### Security Rules (`firestore.rules`)
Security is based on **Database-Backed Access Control (DBAC)**:
*   **Admin**: Any user whose UID is in `/app_admins/` has full database access.
*   **Organizer**: Has access only to events where their UID is in the `ownerId` field or the `members` map.
*   **Public**: Can only read events that have the flag `isActive: true`. Registration is allowed only for active events.

---

## 4. AI / Genkit Functions

The application has ready-made AI infrastructure located in `src/ai/`.
*   **Configuration**: The `src/ai/genkit.ts` file initializes the Genkit library with the `googleai/gemini-2.5-flash` model.
*   **Usage**: The system is prepared to implement "Flows" – e.g., automatically generating event descriptions based on keywords or assisting in the analysis of registration data.

---

## 5. Configuration and Environment Variables

The following keys are required in the `.env.local` file for the application to function correctly:

```bash
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx

# Firebase Admin (Server-side)
FIREBASE_PROJECT_ID=xxx
FIREBASE_CLIENT_EMAIL=xxx
FIREBASE_PRIVATE_KEY="xxx"

# Email (Resend)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=no-reply@yourdomain.com
```

---

## 6. Execution and Deployment

### Local Setup
1. Install dependencies: `npm install`
2. Run development server: `npm run dev`
3. Application available at: `http://localhost:9002`

### Deployment
The project is configured for **Firebase App Hosting**.
*   **Configuration**: The `apphosting.yaml` file defines runtime settings (e.g., `maxInstances`).
*   **Deployment**: Occurs automatically via GitHub integration after pushing changes to the main branch.
