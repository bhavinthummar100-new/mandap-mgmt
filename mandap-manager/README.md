# Mandap Manager

A mobile-first Mandap Decoration & Event Rental business management system built with React, TypeScript, Vite, Tailwind CSS, and Firebase.

## Features

- Inquiry & Estimate management with PDF export
- One-click estimate to booking conversion
- WhatsApp job sheet generator
- Inventory management with stock alerts
- Labor, vendor, and expense tracking
- Dual GST / non-GST invoicing with separate numbering
- Dashboard with charts and analytics
- Calendar view with color-coded events
- Bilingual UI (English + Gujarati)
- Dark mode
- Backup & restore
- Role-based access (Admin, Manager, Worker)

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Firebase Auth, Firestore, Storage
- jsPDF, Recharts, react-big-calendar
- Deployable on Vercel (no backend server)

## Setup

### 1. Firebase Project

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** → Email/Password
3. Create **Firestore** database
4. Enable **Storage**
5. Register a web app and copy config values

### 2. Environment Variables

```bash
cp .env.example .env
```

Fill in your Firebase config:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_GEMINI_MODEL=gemini-3.5-flash
```

### 3. Enable Firebase AI Logic (Gemini Flash)

From this project directory, run:

```bash
npx -y firebase-tools@latest init ailogic
```

Pick your web app when prompted (for this project: `mandap-management`).

If this step is skipped, AI parsing calls can fail with `PERMISSION_DENIED`.

### 4. Firestore Rules & Indexes

```bash
npm install -g firebase-tools
firebase login
firebase use your-project-id
firebase deploy --only firestore
```

### 5. Create Admin User

1. Create user in Firebase Auth console
2. Add Firestore document at `users/{uid}`:

```json
{
  "uid": "YOUR_UID",
  "email": "admin@mandap.com",
  "displayName": "Admin",
  "role": "admin",
  "isActive": true,
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```

### 6. Run Locally

```bash
npm install
npm run dev
```

### 7. Load Sample Data

Login as admin → Settings → "Load Sample Data"

### 8. Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add all `VITE_FIREBASE_*` env variables
4. Deploy (SPA rewrite is configured in `vercel.json`)

## Project Structure

```
src/
├── app/           # Router & providers
├── components/    # UI, layout, shared
├── features/      # Page components per module
├── services/      # Firestore CRUD services
├── hooks/         # Auth, theme hooks
├── lib/           # Firebase, i18n, constants
├── types/         # TypeScript interfaces
├── utils/         # PDF, WhatsApp, calculations
└── seed/          # Sample data loader
```

## Core Workflow

```
Inquiry → Estimate → Booking → Dispatch → Complete → Payment → Invoice
```

## License

Private - for business use only.
