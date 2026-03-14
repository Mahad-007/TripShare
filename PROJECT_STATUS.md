# TripShare — Project Status Report

> **Date:** March 14, 2026
> **Authors:** Ehtisham Ali (SP-22/BS SE/069), Zohaib-ul-Hassan (SP-22/BS SE/013)
> **Project:** Final Year Project — BS Software Engineering, Lahore Garrison University
> **Platform:** React 19 + TypeScript + Vite (Web Prototype) | Firebase Backend
> **Firebase Project:** `tripshare-2e94f`

---

## Overall Progress Summary

| Metric | Value |
|--------|-------|
| Total Execution Phases | 11 (Phase 0–10) |
| Phases Completed | 4 (Phase 0, 1, 2, 3) |
| Phases Remaining | 7 (Phase 4–10) |
| SRS Requirements (REQ-1 to REQ-25) | 15 of 25 fully implemented |
| Source Files | 28 files across services, contexts, components, pages, utils |

---

## Completed Work

### Phase 0: Project Setup & Configuration — COMPLETED

| Task | Description | Status |
|------|-------------|--------|
| 0.1 | Install Firebase SDK (`firebase` package) | Done |
| 0.2 | Create Firebase project in Firebase Console | Done (`tripshare-2e94f`) |
| 0.3 | Enable Firebase Auth (Email/Password + Google Sign-In) | Done |
| 0.4 | Create Firestore database with security rules | Done |
| 0.5 | Enable Firebase Cloud Storage | Partially (bucket exists, not used yet) |
| 0.6 | Create `services/firebase.ts` — Firebase init & config | Done |
| 0.7 | Create `services/firestore.ts` — Firestore helpers | Done (merged into tripService.ts & expenseService.ts) |
| 0.8 | Create `services/storage.ts` — Cloud Storage helpers | Not done (deferred to Phase 4) |
| 0.9 | Update `types.ts` — Firestore-compatible types | Done (User, Trip, FirestoreTrip, Expense, etc.) |
| 0.10 | Set up `.env.local` for Firebase config keys | Done (6 Firebase vars + Gemini key) |
| 0.11 | Install `react-router-dom` for routing | Done (v7.13.1) |
| 0.12 | State management approach (React Contexts) | Done (AuthContext + TripContext) |
| 0.13 | Create `utils/imageUtils.ts` — image compression | Not done (deferred to Phase 4) |

**Firestore Collections Created:**
- `users/{userId}` — name, email, avatar, createdAt
- `trips/{tripId}` — full trip document with ownerId, participantIds[], status, isPublic
- `trips/{tripId}/expenses/{expenseId}` — expense subcollection

**Firestore Collections NOT Created Yet:**
- `trips/{tripId}/media/` — for photos/videos
- `trips/{tripId}/itinerary/` — for planned activities
- `invitations/` — for participant invitations
- `notifications/{userId}/items/` — for in-app notifications
- `likes/{tripId}/{userId}` — for social likes
- `comments/{tripId}/` — for social comments
- `followers/{userId}/{followerId}` — for user follows
- `verificationLog/` — for blockchain verification audit trail

---

### Phase 1: User Authentication & Routing — COMPLETED

**SRS Requirements Covered: REQ-1, REQ-2, REQ-3, REQ-4, REQ-5**

| Task | Description | Status |
|------|-------------|--------|
| 1.1 | `services/authService.ts` — all auth functions | Done |
| 1.2 | `contexts/AuthContext.tsx` — auth state context | Done |
| 1.3 | React Router refactor (tabs → URL routes) | Done (12 protected + 3 public routes) |
| 1.4 | LoginPage — real Firebase Auth + Google Sign-In | Done |
| 1.5 | RegistrationPage — real registration + user doc creation | Done |
| 1.6 | ForgotPasswordPage — password reset via email | Done |
| 1.7 | Session management — 30-min inactivity timeout | Done |
| 1.8 | App.tsx — thin shell (AuthProvider → Router → Layout → Routes) | Done |
| 1.9 | Firestore security rules for auth | Done |

**Key Implementation Details:**
- Email/password auth with Firebase `createUserWithEmailAndPassword` / `signInWithEmailAndPassword`
- Google Sign-In via `signInWithPopup` (web) + Capacitor plugin (native)
- Vite COOP header (`same-origin-allow-popups`) configured for Google popup
- Password validation: min 8 chars, uppercase, number
- Firebase error codes mapped to user-friendly messages (`utils/firebaseErrors.ts`)
- Auth state persists across page refreshes via `onAuthStateChanged`
- `ProtectedRoute` component redirects unauthenticated users to `/login`

---

### Phase 2: Trip Management CRUD & Role-Based Access — COMPLETED

**SRS Requirements Covered: REQ-6, REQ-7, REQ-8 (partial), REQ-9 (partial), REQ-10**

| Task | Description | Status |
|------|-------------|--------|
| 2.1 | `services/tripService.ts` — full CRUD + real-time | Done |
| 2.2 | Role-based access (owner/participant/none) | Done (UI + security rules) |
| 2.3 | AddTripPage — save to Firestore with validation | Done |
| 2.4 | EditTripPage — owner-only edit with pre-filled form | Done |
| 2.5 | Trip deletion — owner-only with confirmation | Done |
| 2.6 | Participant invitations via email | Partial (direct add-by-email, no invitation workflow) |
| 2.7 | Dashboard — real Firestore data + stats | Done |
| 2.8 | TripDetail — real data with role-based controls | Done |

**Key Implementation Details:**
- Dual type strategy: `FirestoreTrip` (document shape) vs `Trip` (UI shape with hydrated `User[]` participants)
- Module-level user cache in `tripService.ts` prevents redundant reads during participant hydration
- Trip statuses: draft, active, completed, archived
- `isPublic` boolean for Explore feed visibility
- Cover image stored as URL string (no Cloud Storage upload yet)
- `getUserRole()` helper returns `'owner' | 'participant' | 'none'`
- Real-time subscription via `onSnapshot` with proper listener cleanup
- Computed dashboard stats: trip count, completed count, unique destinations

---

### Phase 3: Expense Tracking — COMPLETED

**SRS Requirements Covered: REQ-11, REQ-12, REQ-13, REQ-14, REQ-15 (partial)**

| Task | Description | Status |
|------|-------------|--------|
| 3.1 | Fix expense-trip linkage (trip selector dropdown) | Done |
| 3.2 | `services/expenseService.ts` — full CRUD + real-time | Done |
| 3.3 | AddExpenseModal — add with validation | Done |
| 3.4 | EditExpenseModal — edit (combined into AddExpenseModal) | Done |
| 3.5 | ExpensesPage — real Firestore data + charts + AI | Done |
| 3.6 | Historical expense retrieval + date filtering | Done (month-based filter) |
| 3.7 | Expense notifications | Not done (TODO comments placed for Phase 7) |

**Key Implementation Details:**
- Expenses stored as Firestore subcollection: `trips/{tripId}/expenses/{expenseId}`
- Combined Add/Edit modal via `AddExpenseModal` with optional `editingExpense` prop
- Validation: amount > 0, required fields, at least 1 participant selected
- Equal split calculation among selected participants
- Permission-based controls: owner, payer, or creator can edit/delete
- Pie chart visualization with Recharts
- AI expense analysis via Google Gemini (`gemini-3-flash-preview`)
- Export expense summary as `.txt` file download
- Real-time balance updates via `onSnapshot`

---

## Pending Work

### Phase 4: Media Capture & Gallery — NOT STARTED

**SRS Requirements: REQ-21, REQ-22, REQ-23, REQ-24, REQ-25**
**Priority:** MEDIUM | **Depends on:** Phase 2 (completed)

| Task | Description | Current State |
|------|-------------|---------------|
| 4.1 | Media capture (camera/file picker) | Camera button exists but non-functional |
| 4.2 | Media upload to Firebase Cloud Storage | Not implemented |
| 4.3 | GalleryPage with real media | Hardcoded 6 placeholder images from picsum.photos |
| 4.4 | Explore/Public Gallery with real data | Hardcoded 3 mock feed posts |
| 4.5 | Error handling (permissions, upload failures) | Not implemented |
| 4.6 | Firestore & Storage security rules for media | Not implemented |

**What Needs to Be Built:**
- `services/storage.ts` — Cloud Storage upload/download/delete helpers
- `utils/imageUtils.ts` — image compression, thumbnail generation, file size validation
- `trips/{tripId}/media/` Firestore subcollection for metadata
- Firebase Storage at `trips/{tripId}/media/{filename}`
- Upload progress bar, preview before upload
- 10MB file size limit enforcement
- Lightbox/full-screen media viewer
- Media deletion (from both Storage and Firestore)
- Replace all hardcoded mock images

---

### Phase 5: Map & Route Planning — NOT STARTED

**SRS Requirements: REQ-16, REQ-17, REQ-18, REQ-19, REQ-20**
**Priority:** MEDIUM | **Depends on:** Phase 0 (completed)

| Task | Description | Current State |
|------|-------------|---------------|
| 5.1 | Install & configure Google Maps API | Not done |
| 5.2 | Real-time user location on map | Grayscale placeholder image displayed |
| 5.3 | Destination search with autocomplete | Search bar exists but non-functional |
| 5.4 | Route planning with directions | Not implemented |
| 5.5 | Nearby attractions from Places API | Hardcoded list (Baltit Fort, Eagle's Nest) |
| 5.6 | GPS error handling | Not implemented |
| 5.7 | Offline map support | Not implemented (web platform limitations) |

**What Needs to Be Built:**
- Google Maps API key with Maps JS API + Places API + Directions API
- `@vis.gl/react-google-maps` or `@react-google-maps/api` package
- Replace placeholder image with real Google Maps component
- `navigator.geolocation.watchPosition()` for real-time location
- Google Places Autocomplete for search
- Google Directions API for route polylines + ETA
- Nearby Places search for real POIs
- GPS permission denied / unavailable error handling
- localStorage caching for recent searches (best-effort offline)

---

### Phase 6: Blockchain Verification — NOT STARTED

**SRS Section: 5.6.6 — HashGenerator, VerificationEngine, BlockchainInterface**
**Priority:** MEDIUM | **Depends on:** Phase 4 (not started)

| Task | Description | Current State |
|------|-------------|---------------|
| 6.1 | `services/blockchainService.ts` — SHA-256 hashing | Not implemented |
| 6.2 | Auto-hash on media upload | Not implemented |
| 6.3 | Verification UI (verify button, hash details) | "Verified" badges shown but cosmetic only |
| 6.4 | `verificationLog/` Firestore collection | Not created |
| 6.5 | Gallery verification status from real hash comparison | Hardcoded `isVerified` boolean |
| 6.6 | Explore page with genuinely verified content | Mock data only |

**What Needs to Be Built:**
- SHA-256 hash generation using Web Crypto API
- Hash storage in media document `blockchainHash` field
- Re-hash and compare for tamper detection
- Immutable verification log (append-only Firestore rules)
- Replace cosmetic "Verified" badges with real cryptographic verification
- Public gallery filters based on genuine verification status

---

### Phase 7: Notifications System — NOT STARTED

**SRS Requirements: REQ-8, REQ-15, SRS 5.5**
**Priority:** HIGH | **Depends on:** Phase 3 (completed)

| Task | Description | Current State |
|------|-------------|---------------|
| 7.1 | `services/notificationService.ts` | Not implemented |
| 7.2 | NotificationsPage | Not implemented (route not defined) |
| 7.3 | Notification badge in Layout header | Not implemented |
| 7.4 | Wire notification triggers across app | TODO comments in `expenseService.ts` (lines 33, 45, 53) |
| 7.5 | Notification cleanup (TTL/pagination) | Not implemented |

**What Needs to Be Built:**
- `notifications/{userId}/items/` Firestore collection
- CRUD + real-time subscription for notifications
- Notification types: trip invite, expense added/updated/deleted, trip changed, media uploaded
- NotificationsPage with grouped list, read/unread, deep linking
- Bell icon with unread count badge in header
- 30-day auto-cleanup or pagination

---

### Phase 8: Profile, Settings & Report Generation — NOT STARTED

**SRS Section: 2.2 (Report Generation), Profile**
**Priority:** LOW | **Depends on:** Phase 1 + Phase 3 (both completed)

| Task | Description | Current State |
|------|-------------|---------------|
| 8.1 | ProfilePage with real stats | Shows real name/email, but stats are hardcoded (12, 48, 1.2k) |
| 8.2 | Report generation (PDF/CSV export) | Expense .txt export exists; PDF/CSV not implemented |
| 8.3 | Settings screen | Not implemented |
| 8.4 | Profile menu items wired up | Menu items visible but non-functional |

**What Needs to Be Built:**
- Real trip/photo/follower counts from Firestore
- Avatar upload to Firebase Storage
- Edit name functionality
- PDF export with `jspdf` or `html2canvas`
- CSV expense export
- Settings page (notification prefs, privacy, account deletion)
- Functional profile menu navigation

---

### Phase 9: Explore & Social Features — NOT STARTED

**SRS Section: REQ-24, 2.2 (Public Trip Gallery)**
**Priority:** LOW | **Depends on:** Phase 6 (not started)

| Task | Description | Current State |
|------|-------------|---------------|
| 9.1 | Trip privacy toggle in create/edit | `isPublic` field exists but not exposed in form UI |
| 9.2 | ExplorePage with real public trips | Hardcoded `EXPLORE_DATA` array with 3 mock posts |
| 9.3 | Filter functionality (Trending, Verified, etc.) | Filter tabs visible but non-functional |
| 9.4 | Social interactions (like, comment, share) | Buttons visible but non-functional |
| 9.5 | "Connect" / follow users | Not implemented |

**What Needs to Be Built:**
- Public trips query (`where isPublic == true`)
- `likes/{tripId}/{userId}` collection for likes
- `comments/{tripId}/` collection for comments
- `followers/{userId}/{followerId}` collection for follows
- Real search by destination/title
- "Trending" sorting by like count
- "Verified Only" filter by blockchain hash
- Share via clipboard / Web Share API

---

### Phase 10: Polish, Performance, Deployment & Non-Functional — NOT STARTED

**SRS Sections: 5.1 (Performance), 5.2, 5.3 (Security), 5.4**
**Priority:** MEDIUM | **Depends on:** All previous phases

| Category | Tasks | Status |
|----------|-------|--------|
| Performance | Lazy loading, bundle splitting, < 2s dashboard load | Not done |
| Offline Support | Firestore `enableIndexedDbPersistence()` | Not done |
| Error Handling | Global Error Boundary, toast system, loading skeletons | Partial (some loading spinners exist) |
| Security | Comprehensive rules audit, input sanitization, HTTPS | Security rules deployed but not audited |
| Firestore Cost | Listener cleanup audit, pagination | Not done |
| Deployment | Firebase Hosting, CI/CD | Not deployed |
| Responsive Design | Cross-device testing, accessibility (ARIA) | Mobile-first design exists, no audit |
| Testing | Unit tests, integration tests, E2E tests | No tests written |

---

## SRS Requirements Traceability Matrix

| Req ID | Description | Status | Phase | Notes |
|--------|-------------|--------|-------|-------|
| **REQ-1** | Register via email/password or Google Sign-In | **Done** | 1 | Firebase Auth with both providers |
| **REQ-2** | Authenticate via Firebase Authentication | **Done** | 1 | `signInWithEmailAndPassword` + `signInWithPopup` |
| **REQ-3** | Password reset via secure email links | **Done** | 1 | `sendPasswordResetEmail` on ForgotPasswordPage |
| **REQ-4** | Invalid login shows clear error messages | **Done** | 1 | `firebaseErrors.ts` maps codes to messages |
| **REQ-5** | Sessions expire after 30 min inactivity | **Done** | 1 | Custom idle timer in AuthContext |
| **REQ-6** | Create trips with title, description, dates, location | **Done** | 2 | Full Firestore CRUD |
| **REQ-7** | Only trip owner can edit/delete trips | **Done** | 2 | UI + Firestore security rules enforced |
| **REQ-8** | Participants invited via email or notification | **Partial** | 2/7 | Direct add-by-email works; invitation workflow pending |
| **REQ-9** | Trip details stored in Firestore, available offline | **Partial** | 2/10 | Firestore storage done; offline persistence not enabled |
| **REQ-10** | Validate input to prevent invalid/empty fields | **Done** | 2 | Client-side validation on all forms |
| **REQ-11** | Record expenses with amount, payer, description | **Done** | 3 | Firestore subcollection CRUD |
| **REQ-12** | Update participant balances in real-time | **Done** | 3 | `onSnapshot` real-time subscription |
| **REQ-13** | Prevent negative or invalid expense charges | **Done** | 3 | Amount > 0, required fields validated |
| **REQ-14** | Store and retrieve historical expenses per trip | **Done** | 3 | Firestore persistence + date filtering |
| **REQ-15** | Notify participants of new/updated expenses | **Pending** | 7 | TODO comments placed; notifications not built |
| **REQ-16** | Display user location in real-time on Google Maps | **Pending** | 5 | Placeholder image only |
| **REQ-17** | Allow search for destinations and attractions | **Pending** | 5 | Non-functional search bar |
| **REQ-18** | Route planning optimized for distance/time | **Pending** | 5 | Not implemented |
| **REQ-19** | Cache maps offline for navigation | **Pending** | 5/10 | Not implemented (web platform limitations) |
| **REQ-20** | User-friendly alerts for GPS/location errors | **Pending** | 5 | Not implemented |
| **REQ-21** | Capture photos/videos directly via the app | **Pending** | 4 | Camera button exists, non-functional |
| **REQ-22** | Upload media securely to Firebase Cloud Storage | **Pending** | 4 | Not implemented |
| **REQ-23** | Display trip-specific media galleries | **Pending** | 4 | Hardcoded mock images |
| **REQ-24** | Public gallery displays verified content only | **Pending** | 6/9 | Mock "verified" badges |
| **REQ-25** | Clear error messages for failed capture/upload | **Pending** | 4 | Not implemented |

### Summary Count
- **Fully Implemented:** 13 requirements (REQ-1 through REQ-7, REQ-10 through REQ-14, REQ-9 partial)
- **Partially Implemented:** 2 requirements (REQ-8, REQ-9)
- **Not Implemented:** 10 requirements (REQ-15 through REQ-25)

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React | 19 |
| Language | TypeScript | 5.8 |
| Build Tool | Vite | 6.4 |
| Styling | Tailwind CSS (CDN) | Latest |
| Icons | Lucide React | 0.562.0 |
| Routing | react-router-dom | 7.13.1 |
| Charts | Recharts | 3.6.0 |
| AI | Google Gemini (`@google/genai`) | 1.35.0 |
| Backend | Firebase (Auth, Firestore) | 12.10.0 |
| Native Bridge | Capacitor | Configured (Android) |

---

## File Structure

```
src/
├── App.tsx                          # Router + Providers shell
├── index.tsx                        # Entry point
├── types.ts                         # All TypeScript interfaces
├── contexts/
│   ├── AuthContext.tsx               # Auth state, login/register/logout
│   └── TripContext.tsx               # Trip state, Firestore subscription
├── services/
│   ├── firebase.ts                  # Firebase app init, exports auth & db
│   ├── authService.ts               # Auth wrappers (register, login, Google, reset)
│   ├── tripService.ts               # Trip CRUD, real-time subscriptions, participant mgmt
│   ├── expenseService.ts            # Expense CRUD (subcollection), real-time subscription
│   └── geminiService.ts             # Gemini AI integration
├── components/
│   ├── Layout.tsx                   # NavLink navigation + Outlet
│   ├── ProtectedRoute.tsx           # Auth guard with loading spinner
│   └── AddExpenseModal.tsx          # Combined add/edit expense modal
├── pages/
│   ├── Dashboard.tsx                # Trip cards, stats (real data)
│   ├── TripDetail.tsx               # Single trip view with role-based controls
│   ├── AddTripPage.tsx              # Trip creation form (Firestore)
│   ├── EditTripPage.tsx             # Trip edit form (owner-only)
│   ├── ExpensesPage.tsx             # Expense list, pie chart, AI analysis
│   ├── MapsPage.tsx                 # Placeholder map (mock data)
│   ├── GalleryPage.tsx              # Placeholder gallery (mock images)
│   ├── ExplorePage.tsx              # Placeholder social feed (mock data)
│   ├── ProfilePage.tsx              # User profile (partial real data)
│   ├── LoginPage.tsx                # Firebase Auth login
│   ├── RegistrationPage.tsx         # Firebase Auth registration
│   └── ForgotPasswordPage.tsx       # Password reset via email
├── utils/
│   └── firebaseErrors.ts           # Firebase error code → user message mapping
├── firestore.rules                  # Deployed Firestore security rules
└── .env.local                       # Firebase config + Gemini API key
```

---

## Recommended Next Steps (Priority Order)

1. **Phase 7: Notifications** (HIGH priority, dependencies met) — Builds on completed Phase 3; fills REQ-8 and REQ-15 gaps
2. **Phase 5: Maps** (MEDIUM priority, dependencies met) — Independent of other pending work; fills 5 SRS requirements (REQ-16 to REQ-20)
3. **Phase 4: Media Gallery** (MEDIUM priority, dependencies met) — Unblocks Phase 6 (Blockchain); fills REQ-21 to REQ-25
4. **Phase 8: Profile & Reports** (LOW priority, dependencies met) — Quick wins for profile stats and PDF/CSV export
5. **Phase 6: Blockchain** (MEDIUM priority, blocked by Phase 4) — Requires media upload to function
6. **Phase 9: Social Features** (LOW priority, blocked by Phase 6) — Requires blockchain verification
7. **Phase 10: Polish & Deployment** (MEDIUM priority, after all phases) — Final integration, testing, and deployment
