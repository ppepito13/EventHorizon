# Dokumentacja Techniczna Projektu: EventHorizon (Commerzbank Łódź Events)

## 1. Przegląd Projektu (Overview)

### Cel aplikacji
**EventHorizon** to kompleksowa platforma do zarządzania wydarzeniami firmowymi i społecznościowymi, dedykowana dla Commerzbank Łódź. Aplikacja umożliwia dynamiczne tworzenie stron wydarzeń, rejestrację uczestników z wykorzystaniem konfigurowalnych formularzy, generowanie kodów QR do szybkiego check-inu oraz zaawansowane zarządzanie uprawnieniami (Administrator vs Organizator).

### Stos technologiczny (Tech Stack)
*   **Framework**: Next.js 15.5.9 (App Router)
*   **Język**: TypeScript
*   **Frontend**: React 19.2.1, Tailwind CSS 3.4.1
*   **Komponenty UI**: shadcn/ui (Radix UI)
*   **Baza danych i Auth**: Firebase SDK 11.9.1 (Firestore, Authentication)
*   **Backend**: Firebase Admin SDK 12.1.0 (używany w Server Actions i API)
*   **AI**: Genkit 1.20.0 (integracja z Google Gemini)
*   **Ikony**: Lucide React
*   **Obsługa E-mail**: Resend SDK

---

## 2. Architektura Frontendu

### Struktura Routingów (`src/app/`)
Projekt wykorzystuje **Next.js App Router**. Podział na sekcje:

*   **Publiczne**:
    *   `/`: Strona główna z listą aktywnych wydarzeń.
    *   `/events/[slug]`: Dynamiczna strona konkretnego wydarzenia z formularzem rejestracji.
    *   `/login`: Strona logowania do panelu administracyjnego.
*   **Admin (`/admin/`)**:
    *   `/admin`: Dashboard z tabelą wydarzeń.
    *   `/admin/registrations`: Centralne zarządzanie zgłoszeniami i wysyłka mailingów.
    *   `/admin/check-in`: Moduł skanera kodów QR i manualnego potwierdzania obecności.
    *   `/admin/users`: Zarządzanie kontami organizatorów (tylko dla Administratora).
    *   `/admin/account`: Ustawienia profilu i zmiana motywu.

### Wzorce dostępu do danych
Aplikacja łączy dwa podejścia:
1.  **Client-Side Real-time (Firestore SDK)**: Tabele w panelu admina używają hooków `useCollection` i `useDoc`, co zapewnia natychmiastowe odświeżanie danych bez przeładowania strony (np. statusy obecności).
2.  **Server Actions**: Używane do operacji wymagających bezpieczeństwa lub integracji zewnętrznych (np. wysyłka e-mail, logowanie, manipulacja plikami JSON z użytkownikami).

---

## 3. Integracja z Firebase i Logika Backendowa

### Autoryzacja (Auth)
Proces logowania (`src/app/login/`) opiera się na **Firebase Authentication**.
*   **Zarządzanie sesją**: Po poprawnym logowaniu po stronie klienta, token ID jest przesyłany do endpointu `/api/auth/login`, który weryfikuje go za pomocą Firebase Admin SDK i zapisuje dane użytkownika w sesji (obsługiwanej przez `src/lib/session.ts`).
*   **Dostawcy**: Password (Email/Hasło) oraz Anonymous (do celów testowych/publicznych).

### Baza Danych (Firestore)
Struktura danych (`src/lib/types.ts`) jest zoptymalizowana pod kątem bezpieczeństwa i wydajności:

| Kolekcja | Opis | Główne pola |
| :--- | :--- | :--- |
| `events` | Definicje wydarzeń | `id`, `name`, `slug`, `formFields`, `isActive`, `ownerId`, `members` (mapa ról) |
| `events/{id}/registrations` | Uczestnicy danego eventu | `id`, `formData` (dynamiczne), `qrId`, `checkedIn`, `isApproved` |
| `app_admins` | Globalni administratorzy | Dokument ID = UID użytkownika (brak dodatkowych pól) |
| `qrcodes` | Skrócone dane dla skanera | `eventId`, `qrId`, `registrationDate` |

### Reguły Bezpieczeństwa (`firestore.rules`)
Bezpieczeństwo oparte jest na **Database-Backed Access Control (DBAC)**:
*   **Admin**: Każdy użytkownik, którego UID znajduje się w `/app_admins/`, ma pełny dostęp do bazy.
*   **Organizator**: Ma dostęp tylko do wydarzeń, gdzie jego UID znajduje się w polu `ownerId` lub mapie `members`.
*   **Public**: Może czytać tylko te wydarzenia, które mają flagę `isActive: true`. Rejestracja jest dozwolona tylko dla aktywnych eventów.

---

## 4. Funkcje AI / Genkit

Aplikacja posiada gotową infrastrukturę dla sztucznej inteligencji zlokalizowaną w `src/ai/`.
*   **Konfiguracja**: Plik `src/ai/genkit.ts` inicjalizuje bibliotekę Genkit z modelem `googleai/gemini-2.5-flash`.
*   **Zastosowanie**: System jest przygotowany do implementacji "Flows" – np. automatycznego generowania opisów wydarzeń na podstawie kilku słów kluczowych lub pomocy w analizie danych rejestracyjnych.

---

## 5. Konfiguracja i Zmienne Środowiskowe

Do poprawnego działania aplikacji wymagany jest plik `.env.local` z następującymi kluczami:

```bash
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx

# Firebase Admin (na serwerze)
FIREBASE_PROJECT_ID=xxx
FIREBASE_CLIENT_EMAIL=xxx
FIREBASE_PRIVATE_KEY="xxx"

# Email (Resend)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=no-reply@yourdomain.com
```

---

## 6. Uruchomienie i Deployment

### Lokalne uruchomienie
1. Zainstaluj zależności: `npm install`
2. Uruchom serwer deweloperski: `npm run dev`
3. Aplikacja dostępna pod adresem: `http://localhost:9002`

### Deployment
Projekt jest skonfigurowany pod **Firebase App Hosting** (następca Firebase Hosting dla aplikacji Next.js SSR).
*   **Konfiguracja**: Plik `apphosting.yaml` definiuje ustawienia środowiska uruchomieniowego (np. `maxInstances`).
*   **Wdrażanie**: Odbywa się automatycznie poprzez integrację z repozytorium GitHub po wypchnięciu zmian na gałąź główną.
