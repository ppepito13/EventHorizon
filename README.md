# 🚀 EventHorizon (Commerzbank Łódź Events)

**EventHorizon** is a robust, full-stack event management platform tailored for Commerzbank Łódź. It streamlines the entire lifecycle of corporate and social events—from dynamic landing page creation and flexible participant registration to automated email communication and real-time QR code check-ins.

The application solves the challenge of managing multiple events with diverse requirements by providing a centralized, role-based administration panel and a high-performance public interface.

---

## ✨ Main Features

- 🔐 **Secure Authentication**: Multi-role access control (Administrator & Organizer) powered by Firebase Authentication.
- 📅 **Dynamic Event Management**: Create and customize event pages with a built-in WYSIWYG editor and flexible scheduling.
- 📝 **Custom Registration Forms**: Define dynamic fields (text, choice, checkboxes) for each event to collect specific participant data.
- 📧 **Automated Communication**: Integrated email notification system via Resend for registration confirmations and status updates.
- 📱 **QR Check-in System**: Generate unique QR codes for attendees and a mobile-friendly scanner for organizers to manage on-site attendance.
- 🤖 **AI-Enhanced Experience**: Infrastructure ready for AI-powered content generation using Google Gemini and Firebase Genkit.
- 📊 **Data Export**: Export registration data to CSV/Excel formats for advanced reporting and analytics.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 15 (App Router)](https://nextjs.org/) |
| **Frontend** | [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/) |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) (Radix UI) |
| **Database** | [Cloud Firestore](https://firebase.google.com/docs/firestore) |
| **Authentication** | [Firebase Authentication](https://firebase.google.com/docs/auth) |
| **AI / GenAI** | [Firebase Genkit](https://firebase.google.com/docs/genkit) + Google Gemini |
| **Emails** | [Resend](https://resend.com/) |

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v18+) installed on your machine.

### 2. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory and provide your Firebase and Resend credentials (refer to `docs/docs.md` for the full list of required keys):
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... and other keys
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:9002](http://localhost:9002) with your browser to see the results.

---

## 📁 Project Structure

```text
src/
├── ai/             # AI integration logic and Genkit flows
├── app/            # Next.js App Router (Pages, Layouts, API)
├── components/     # Reusable UI components (shadcn/ui)
├── firebase/       # Client-side Firebase configuration and hooks
├── hooks/          # Custom React hooks
├── lib/            # Shared utilities, types, and server-side logic
└── services/       # External service integrations (e.g., Email)
```

---

## 📘 Full Documentation

For detailed technical information, including **database schemas**, **security rules**, **architecture patterns**, and **deployment guides**, please refer to the dedicated documentation file:

👉 **[Read full technical documentation (docs/docs.md)](/docs/docs.md)**

---

## 📄 License
This project is proprietary software developed for Commerzbank Łódź.
