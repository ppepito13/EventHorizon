# Project Plan: EventHorizon (Commerzbank Łódź Events)

This document outlines the strategic roadmap, functional epics, and detailed user stories for the EventHorizon platform. It serves as the primary backlog for the development team to transition from MVP to a production-ready system.

---

## 1. Project Vision & Goal

**EventHorizon** is designed to be the centralized event management platform for Commerzbank Łódź. Its goal is to provide a seamless, end-to-end experience for both event organizers and participants.

*   **Organizers & Admins** get a powerful dashboard to create themed events with dynamic registration forms, manage participants, and handle on-site check-ins using QR technology.
*   **Participants** receive a modern, accessible registration portal tailored to each event's specific needs, with automated email confirmations and digital tickets.

---

## 2. Roadmap / Milestones

### Phase 1: Core Foundation & Secure Access
*   **Focus**: Migration of legacy JSON data to Firestore, robust Authentication flow, and Role-Based Access Control (RBAC).
*   **Key Outcome**: A secure environment where Admins can manage users and Organizers can access assigned events.

### Phase 2: Dynamic Event Lifecycle
*   **Focus**: The "Event Engine" – implementing dynamic form field generation, event theming (Primary/Accent colors), and the public registration flow.
*   **Key Outcome**: Capability to launch a new event with custom data requirements in minutes.

### Phase 3: Organizer Command Center
*   **Focus**: Advanced management of registrations (approval workflows), manual/QR check-in system, and data export capabilities.
*   **Key Outcome**: Full operational control over live events and attendee data.

### Phase 4: Intelligent Communication & AI
*   **Focus**: Integration with Resend for mass mailing and Genkit for AI-powered content generation (descriptions, slogans).
*   **Key Outcome**: High-engagement communication and reduced administrative burden through AI assistance.

---

## 3. Epics & User Stories

### Epic 1: Identity & Access Management (IAM)
*Handles authentication and permissions across the platform.*

**US-1.1: Secure Administrative Login**
*   **Story**: As an **Admin/Organizer**, I want to log in using my corporate email and password, so that I can access protected management features.
*   **Technical Notes**: Integration of `firebase/auth` with `src/app/login/`. Transition from `users.json` lookup to a secure `/users` Firestore collection.
*   **Acceptance Criteria**:
    *   Invalid credentials show a descriptive error.
    *   Successful login redirects to `/admin`.
    *   Session is maintained across page refreshes.

**US-1.2: Role-Based Event Assignment**
*   **Story**: As an **Admin**, I want to assign specific events to **Organizers**, so that they only see and manage data relevant to them.
*   **Technical Notes**: Links to `src/app/admin/users/` and the `assignedEvents` array in the User model.
*   **Acceptance Criteria**:
    *   Organizers only see assigned events in their dashboard.
    *   Admins retain "All" access visibility.

---

### Epic 2: Dynamic Event Engine
*The core logic for creating and displaying events.*

**US-2.1: Visual Event Theming**
*   **Story**: As an **Admin**, I want to set primary and accent colors for an event, so that the registration page matches the event's brand identity.
*   **Technical Notes**: Uses `themeColor` in `Event` type. UI rendering in `src/app/events/[slug]/page.tsx`.
*   **Acceptance Criteria**:
    *   Buttons and accents on the public page reflect the chosen color.
    *   Hero image is displayed with the correct overlay.

**US-2.2: Dynamic Form Configuration**
*   **Story**: As an **Organizer**, I want to define custom fields (Dropdowns, Checkboxes, Text) for my event's registration, so that I can collect specific data (e.g., diet, shirt size).
*   **Technical Notes**: Linked to `src/app/admin/events/event-form.tsx` and the `formFields` subcollection in Firestore.
*   **Acceptance Criteria**:
    *   Fields can be marked as 'Required'.
    *   Dropdown/Radio options can be added dynamically.
    *   The public form renders these fields in the correct order.

---

### Epic 3: Participant Experience
*The public-facing side of the application.*

**US-3.1: Event Registration & GDPR Consent**
*   **Story**: As a **Participant**, I want to fill out the registration form and provide mandatory GDPR consent, so that I can join the event legally and securely.
*   **Technical Notes**: Implementation in `src/components/event-registration-form.tsx`.
*   **Acceptance Criteria**:
    *   Form validation prevents submission of missing required fields.
    *   Consent text is displayed correctly according to event settings.
    *   Successful registration shows a "Success" screen with next steps.

**US-3.2: Digital Ticket (QR Code)**
*   **Story**: As a **Participant**, I want to receive a unique QR code after registering, so that I can quickly check in at the venue.
*   **Technical Notes**: Generation via `qrcode` library in `src/components/event-registration-form.tsx` and storage in `/qrcodes` collection.
*   **Acceptance Criteria**:
    *   QR code is unique per registration.
    *   Code is downloadable or viewable on the success page.

---

### Epic 4: Operations & Check-in
*Tools for on-site management.*

**US-4.1: Real-time QR Scanner**
*   **Story**: As an **Organizer**, I want to use my mobile device's camera to scan participant QR codes, so that I can check them in instantly.
*   **Technical Notes**: Located in `src/app/admin/check-in/`. Uses `jsQR` for client-side scanning.
*   **Acceptance Criteria**:
    *   Successful scan updates the `checkedIn` status in Firestore.
    *   Already scanned codes show a warning.
    *   Manual check-in toggle is available as a fallback.

**US-4.2: Registration Management & Approvals**
*   **Story**: As an **Organizer**, I want to review pending registrations and approve or reject them, so that I can control who attends the event.
*   **Technical Notes**: Uses `requiresApproval` flag in `Event` and `isApproved` in `Registration`.
*   **Acceptance Criteria**:
    *   Status updates trigger automated emails via `src/app/actions.ts`.
    *   Filtered lists show "Pending" vs "Approved" attendees.

---

### Epic 5: Communication & Intelligence
*Mass communication and AI-assisted workflows.*

**US-5.1: Targeted Mass Mailing**
*   **Story**: As an **Organizer**, I want to send an email to all currently filtered participants, so that I can share important updates or files.
*   **Technical Notes**: UI in `src/app/admin/registrations/registrations-client-page.tsx`. Requires integration with `src/lib/email.ts` (Resend).
*   **Acceptance Criteria**:
    *   User can use a WYSIWYG editor for the email body.
    *   Final confirmation dialog shows the exact recipient count.

**US-5.2: AI Event Description Assistant**
*   **Story**: As an **Admin**, I want the AI to suggest professional event descriptions based on a few keywords, so that I can save time on copywriting.
*   **Technical Notes**: Infrastructure in `src/ai/genkit.ts`. Requires a new Flow implementation.
*   **Acceptance Criteria**:
    *   AI generates 3 variants of description.
    *   Admin can "Apply" the selected text to the event form.

---

## 4. Technical Debt & Recommendations

1.  **Unified Data Source**: Currently, users are managed via a local `users.json` for some server-side actions and Firestore for others. **Action**: Complete the migration of all user data to a dedicated Firestore `/users` collection with proper Security Rules.
2.  **Schema Validation**: Move from loose object types to strict Zod schemas for all Firestore writes. **Action**: Implement `src/lib/schemas.ts` and use them in both Client Components and Server Actions.
3.  **Form Persistence**: Dynamic forms are complex. **Action**: Refactor the registration form to use a more modular "Field Component Factory" to improve maintainability and testing.
4.  **Security Rules Refinement**: The current `firestore.rules` uses some `get()` calls. **Action**: Ensure all authorization fields (ownerId, isActive) are correctly denormalized into subcollections to ensure rules stay performant and predictable.
5.  **Error Handling**: Replace generic toasts with the `FirestorePermissionError` architecture across all modules to improve developer experience and debugging of security issues.