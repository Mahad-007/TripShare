<div align="center">

# TripShare

**Group Trip Management Platform**

A full-featured web application for planning group trips, splitting expenses, navigating routes, sharing media, and verifying content integrity — built with React, Firebase, and AI.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Mapbox](https://img.shields.io/badge/Mapbox_GL-3.20-000000?logo=mapbox&logoColor=white)](https://www.mapbox.com)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Pages & Routes](#pages--routes)
- [Services](#services)
- [Data Model](#data-model)
- [Security](#security)
- [Native (Android/iOS)](#native-androidios)
- [Authors](#authors)

---

## Overview

TripShare is a Final Year Project for BS Software Engineering at Lahore Garrison University. It is an all-in-one group trip management platform that lets users:

- Create and manage group trips with real-time collaboration
- Track and split expenses with AI-powered analysis
- Navigate with interactive maps, directions, and nearby place discovery
- Share trip photos/videos with blockchain-verified integrity
- Discover public trips and follow other travelers

## Features

### Authentication & User Management
- Email/password registration and login
- Google OAuth sign-in (web popup + Capacitor native)
- Password reset via email
- Profile management with avatar upload
- 30-minute inactivity auto-logout

### Trip Management
- Full CRUD for trips with real-time Firestore sync
- Trip statuses: Draft, Active, Completed, Archived
- Public/private visibility control
- Cover image upload with progress tracking
- Participant management (add/remove by email)
- Owner-only edit and delete controls

### Expense Tracking
- Add, edit, and delete expenses per trip
- Real-time balance calculations
- Pie chart visualization (Recharts)
- Date-range filtering
- CSV export
- AI-powered expense analysis (spending patterns, savings tips)

### Interactive Maps
- Mapbox GL integration with interactive map
- Destination geocoding and search autocomplete
- Nearby places discovery (restaurants, hotels, attractions)
- Turn-by-turn directions
- User geolocation tracking
- Geocoding cache with 7-day TTL

### Media Gallery
- Photo/video upload with client-side compression
- Automatic thumbnail generation
- Full-screen lightbox viewer
- Like/unlike media
- SHA-256 blockchain hash verification for content integrity
- Immutable verification audit log

### Social Features
- Public explore feed with trending content
- Follow/unfollow users
- Travel circle (followers/following management)
- Like and share media

### Invitations & Notifications
- Send trip invitations by email
- Accept/decline invitations from the dashboard
- Real-time notification system with unread badge
- Notification types: invitations, expenses, media uploads, new followers

### AI Integration
- AI-generated trip itineraries (via OpenRouter / Gemini 2.0 Flash)
- AI expense analysis with spending insights

### Reporting
- PDF trip reports (jsPDF)
- CSV expense exports

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + TypeScript 5.8 |
| **Build Tool** | Vite 6 |
| **Styling** | Tailwind CSS 3.4, Lucide React icons |
| **Backend** | Firebase (Auth, Firestore, Cloud Storage) |
| **Maps** | Mapbox GL 3.20 + react-map-gl 8.1 |
| **AI** | OpenRouter API (Google Gemini 2.0 Flash) |
| **Charts** | Recharts 3.6 |
| **PDF** | jsPDF + jspdf-autotable |
| **Native** | Capacitor 8.2 (Android/iOS) |
| **Routing** | react-router-dom 7 |

---

## Project Structure

```
tripshare/
├── App.tsx                     # Root component: router + context providers
├── index.tsx                   # ReactDOM entry point
├── index.css                   # Global styles + Tailwind directives
├── types.ts                    # All TypeScript interfaces
│
├── contexts/
│   ├── AuthContext.tsx          # Auth state, login/logout, inactivity timer
│   └── TripContext.tsx          # Trip CRUD, real-time Firestore subscriptions
│
├── services/
│   ├── firebase.ts             # Firebase app init (Auth, Firestore, Storage)
│   ├── authService.ts          # Register, login (email/Google), password reset
│   ├── tripService.ts          # Trip CRUD, participant hydration, user cache
│   ├── expenseService.ts       # Expense subcollection CRUD, notifications
│   ├── mediaService.ts         # Media upload, compression, thumbnails
│   ├── storageService.ts       # Cover image & avatar Cloud Storage uploads
│   ├── blockchainService.ts    # SHA-256 hashing, verification audit log
│   ├── geminiService.ts        # AI itinerary & expense analysis (OpenRouter)
│   ├── invitationService.ts    # Trip invitation send/accept/decline
│   ├── notificationService.ts  # Real-time notifications, unread counts
│   ├── socialService.ts        # Follow/unfollow, likes, explore feed
│   ├── reportService.ts        # PDF reports, CSV exports
│   └── mapsService.ts          # Mapbox geocoding, directions, nearby places
│
├── components/
│   ├── Layout.tsx              # App shell: header, bottom nav, notification badge
│   ├── ProtectedRoute.tsx      # Auth guard (redirects to login)
│   ├── AddExpenseModal.tsx     # Combined add/edit expense modal
│   ├── UploadMediaModal.tsx    # Media upload with compression & preview
│   └── MediaLightbox.tsx       # Full-screen photo/video viewer
│
├── pages/
│   ├── Dashboard.tsx           # Trip list, invitations, stats
│   ├── TripDetail.tsx          # Trip info, AI itinerary, participants
│   ├── AddTripPage.tsx         # Create trip with cover image upload
│   ├── EditTripPage.tsx        # Edit trip details and settings
│   ├── ExpensesPage.tsx        # Expense tracking, charts, AI analysis
│   ├── MapsPage.tsx            # Interactive map, search, directions
│   ├── GalleryPage.tsx         # Media grid, lightbox, verification
│   ├── ProfilePage.tsx         # User profile, avatar, stats
│   ├── ExplorePage.tsx         # Public feed, trending, follow
│   ├── NotificationsPage.tsx   # Notification center
│   ├── SettingsPage.tsx        # App settings
│   ├── TravelCirclePage.tsx    # Followers/following management
│   ├── LoginPage.tsx           # Email + Google sign-in
│   ├── RegistrationPage.tsx    # User registration
│   └── ForgotPasswordPage.tsx  # Password reset
│
├── hooks/
│   └── useGeolocation.ts       # Geolocation tracking hook
│
├── utils/
│   └── firebaseErrors.ts       # Firebase error code → friendly messages
│
├── firestore.rules             # Firestore security rules
├── storage.rules               # Cloud Storage security rules
├── firestore.indexes.json      # Composite indexes
├── capacitor.config.ts         # Native app configuration
├── vite.config.ts              # Vite config (port 3000, COOP header)
├── tailwind.config.js          # Tailwind content paths
└── tsconfig.json               # TypeScript config (ES2022, path aliases)
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A [Firebase](https://firebase.google.com/) project with Auth, Firestore, and Storage enabled
- A [Mapbox](https://www.mapbox.com/) access token
- An [OpenRouter](https://openrouter.ai/) API key (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/tripshare.git
cd tripshare

# Install dependencies
npm install

# Set up environment variables (see section below)
cp .env.local.example .env.local
# Edit .env.local with your API keys

# Start the development server
npm run dev
```

The app runs at **http://localhost:3000**.

### Build for Production

```bash
npm run build
npm run preview    # Preview the production build
```

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# OpenRouter AI (for itinerary generation & expense analysis)
VITE_OPENROUTER_API_KEY=sk-or-v1-...

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Google OAuth (for Capacitor native sign-in)
VITE_GOOGLE_WEB_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Mapbox (for maps, geocoding, directions)
VITE_MAPBOX_PUBLIC_TOKEN=pk.eyJ1...
```

---

## Architecture

### State Management

TripShare uses React Context for global state:

- **AuthContext** — manages authentication state, user profile, login/logout, and a 30-minute inactivity timer that auto-logs out inactive users
- **TripContext** — manages trip data with real-time Firestore `onSnapshot` subscriptions, keeping the UI in sync across tabs and devices

Individual pages manage their own local state for expenses, media, notifications, and other page-specific data using direct Firestore subscriptions.

### Key Patterns

| Pattern | Description |
|---------|-------------|
| **Dual Type Strategy** | `FirestoreTrip` (document shape with `participantIds: string[]`) vs `Trip` (UI shape with hydrated `participants: User[]`) |
| **User Cache** | Module-level cache in `tripService.ts` avoids redundant Firestore reads during participant hydration |
| **Combined Modal** | `AddExpenseModal` handles both add and edit via an optional `editingExpense` prop |
| **Role-Based Access** | `getUserRole()` returns `'owner' | 'participant' | 'none'` for permission checks |
| **Geocoding Cache** | `mapsService.ts` caches geocoding results in localStorage with a 7-day TTL |
| **Atomic Social Writes** | Follow/unfollow uses Firestore `writeBatch` for dual-write consistency |
| **Append-Only Log** | Blockchain verification log is immutable — no updates or deletes allowed |

### Real-Time Data Flow

```
Firestore (onSnapshot) → Context/State → React Components
         ↑                                      │
         └──── Service Layer (CRUD) ←───────────┘
```

---

## Pages & Routes

### Public Routes

| Path | Page | Description |
|------|------|-------------|
| `/login` | LoginPage | Email/password + Google sign-in |
| `/register` | RegistrationPage | New user registration |
| `/forgot-password` | ForgotPasswordPage | Password reset via email |

### Protected Routes (require authentication)

| Path | Page | Description |
|------|------|-------------|
| `/` | Dashboard | Trip list with status filters, pending invitations, stats |
| `/trip/:tripId` | TripDetail | Trip details, AI itinerary, participant management |
| `/add-trip` | AddTripPage | Create a new trip with cover image |
| `/edit-trip/:tripId` | EditTripPage | Edit trip (owner only) |
| `/expenses` | ExpensesPage | Expense tracking, charts, AI analysis, CSV export |
| `/maps` | MapsPage | Interactive map, geocoding, directions, nearby places |
| `/gallery` | GalleryPage | Media gallery, lightbox, blockchain verification |
| `/profile` | ProfilePage | User profile, avatar, stats |
| `/explore` | ExplorePage | Public feed, trending media, follow users |
| `/notifications` | NotificationsPage | Notification center with unread badges |
| `/settings` | SettingsPage | App settings and preferences |
| `/travel-circle` | TravelCirclePage | Followers/following management |

---

## Services

| Service | Responsibility |
|---------|---------------|
| `firebase.ts` | Firebase app initialization, exports `auth`, `db`, `storage` |
| `authService.ts` | Email/Google authentication, password reset, profile updates |
| `tripService.ts` | Trip CRUD, real-time subscriptions, participant hydration |
| `expenseService.ts` | Expense subcollection CRUD with automatic notifications |
| `mediaService.ts` | Media upload with compression, thumbnails, validation, likes |
| `storageService.ts` | Cover image and avatar uploads to Cloud Storage |
| `blockchainService.ts` | SHA-256 file hashing and immutable verification log |
| `geminiService.ts` | AI itinerary generation and expense analysis via OpenRouter |
| `invitationService.ts` | Trip invitation lifecycle (send, accept, decline) |
| `notificationService.ts` | Real-time notifications with unread count tracking |
| `socialService.ts` | Follow/unfollow, media likes, public explore feed |
| `reportService.ts` | PDF trip report generation and CSV expense exports |
| `mapsService.ts` | Mapbox geocoding, directions, nearby places, search cache |

---

## Data Model

### Firestore Collections

```
users/{userId}
  ├── name, email, createdAt
  ├── followers/{followerId}        # Who follows this user
  └── following/{followedId}        # Who this user follows

trips/{tripId}
  ├── title, destination, startDate, endDate, description
  ├── ownerId, participantIds[], coverImage, status, isPublic
  ├── createdAt, updatedAt
  ├── expenses/{expenseId}          # Expense subcollection
  │     └── amount, description, payerId, date, participants[], createdBy
  └── media/{mediaId}              # Media subcollection
        ├── url, thumbnailUrl, type, caption, uploadedBy
        ├── blockchainHash, isVerified, createdAt
        └── likes/{userId}          # Per-media like tracking

invitations/{invitationId}
  └── tripId, tripTitle, fromUserId, toUserId, toEmail, status, createdAt

notifications/{userId}/items/{notificationId}
  └── type, message, data, read, createdAt

verificationLog/{logId}            # Append-only, immutable
  └── mediaId, tripId, hash, verifiedBy, status, timestamp
```

### TypeScript Interfaces

Defined in `types.ts`:

- `User`, `Trip`, `FirestoreTrip`, `TripFormData`
- `Expense`, `FirestoreExpense`, `ExpenseFormData`
- `Media`, `FirestoreMedia`, `MediaFormData`
- `Invitation`, `FirestoreInvitation`
- `Notification`, `NotificationType`
- `ItineraryItem`, `VerificationResult`, `VerificationLogEntry`

---

## Security

### Firestore Rules

- **Users** — anyone authenticated can read; users can only write their own profile
- **Trips** — owner and participants can read/write; public trips are readable by all
- **Expenses** — only trip participants can create; owner, payer, or creator can edit/delete
- **Media** — participants and public trip viewers can read; only uploader can delete
- **Invitations** — sender creates; receiver accepts/declines
- **Verification Log** — append-only; no updates or deletes allowed (immutable audit trail)
- **Default** — deny all unmatched paths

### Cloud Storage Rules

- Authenticated users can upload to their own paths
- Media stored at `trips/{tripId}/media/{userId}/{filename}`

### Application-Level

- 30-minute inactivity auto-logout
- Owner-only trip editing and deletion
- Permission-based expense controls (owner / payer / creator)
- Firebase error codes mapped to user-friendly messages
- File type and size validation before uploads

---

## Native (Android/iOS)

TripShare supports native mobile builds via [Capacitor](https://capacitorjs.com/):

```bash
# Build the web app
npm run build

# Sync with native projects
npx cap sync

# Open in Android Studio
npx cap open android
```

**Capacitor Configuration** (`capacitor.config.ts`):
- App ID: `com.tripshare.app`
- Web directory: `dist`
- Google Auth plugin configured for native OAuth

---

## Authors

| Name | Roll Number |
|------|-------------|
| **Ehtisham Ali** | SP-22/BS SE/069 |
| **Zohaib-ul-Hassan** | SP-22/BS SE/013 |

**Institution:** Lahore Garrison University
**Program:** BS Software Engineering (Final Year Project)

---

## License

This project is part of an academic submission and is not currently licensed for public distribution.
