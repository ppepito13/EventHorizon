# Migration & Architecture Guide: MVP to Production

This document serves as a transition guide for the production development team. It explains the architectural patterns, trade-offs, and critical considerations for evolving the **EventHorizon** MVP into a full-scale enterprise solution.

---

## 1. Core Patterns to Preserve (or Evolve)

### 🚀 React 19 Patterns
The MVP uses **React 19** features. If your production stack downgrades to React 18, you must refactor:
- **`useActionState`**: Used in `UserForm.tsx` and `ChangePasswordForm.tsx` for form state management.
- **`useTransition`**: Used heavily in the Admin panel to prevent UI blocking during Firestore writes.
- **Server Actions**: Used for sensitive logic (email, user creation). Note that in production, these should be heavily rate-limited.

### 📝 Dynamic Form Engine
The registration system (`EventRegistrationForm.tsx`) is a **Metadata-Driven Form Factory**.
- **Current**: Generates a Zod schema on the fly.
- **Production Tip**: Consider a more robust schema builder like `react-hook-form` with `yup` or `zod` persisted in a more structured JSONB-like format. Ensure that field IDs (names) are immutable once an event starts collecting registrations to avoid data corruption.

### 🎨 Dynamic Theming
Events have custom primary colors (`themeColor`).
- **Current**: Injected via inline styles and CSS variables in `EventCard` and `EventPage`.
- **Production Tip**: If you switch from Tailwind to a different CSS-in-JS or CSS-Modules approach, ensure you have a central "Theme Provider" that can override global styles based on the route context.

---

## 2. Technical Debt & Migration Path

| Feature | MVP Implementation | Production Recommendation |
| :--- | :--- | :--- |
| **User Data** | Hybrid (`users.json` + Firestore) | **Full Firestore Migration**. Unify `/users` and `/app_admins`. |
| **Email** | Direct `Resend` calls in Actions | **Queue-based Mailing**. Use Redis/BullMQ to handle mass mailings asynchronously to avoid timeout issues. |
| **Auth** | Firebase Client SDK | **Firebase Admin + Iron Session/Jose**. Consider more robust SSR session management if high security is required. |
| **Images** | Picsum Placeholders | **Cloud Storage**. Replace hardcoded URLs with signed URLs from Firebase Storage or S3. |
| **Rich Text** | Slate.js (JSON strings) | **Tiptap or Lexical**. Slate is powerful but complex to maintain. If the final team is less experienced with Slate, consider Tiptap for better React integration. |

---

## 3. Database Strategy (Firestore)

### Denormalization for Security
The MVP uses a **Denormalization Strategy** in `firestore.rules`. Authorization fields (`ownerId`, `members`) are copied into subcollection documents. 
- **CRITICAL**: If you change the database schema, remember that Firestore Rules cannot easily join tables. Any move away from this pattern will require either costly `get()` calls in rules or a middleware (Backend) approach.

### Real-time vs. Fetch
- **Admin Panel**: Uses `onSnapshot` for real-time check-in.
- **Public Site**: Uses standard queries.
- **Advice**: Keep the real-time check-in; it’s the "killer feature" for on-site gate management.

---

## 4. Key Integration Points

- **QR System**: The link between `qrcodes` collection and `registrations` is purely via `qrId` (string). Ensure this index is maintained.
- **Genkit (AI)**: The infrastructure is ready in `src/ai/`. It currently uses `gemini-2.5-flash`. If you switch to OpenAI or Anthropic, you only need to change the provider in `genkit.ts`.

---

## 5. Deployment
The project is configured for **Firebase App Hosting**. 
- If you migrate to **Vercel** or **AWS Amplify**, ensure the `FIREBASE_ADMIN_KEY` is handled as a secret, not a standard env variable, due to its size and sensitivity.
