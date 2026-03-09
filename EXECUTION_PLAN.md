# TripShare - Execution Plan (Revised)

> **Goal:** Fully implement all SRS requirements (REQ-1 to REQ-25) + subsystems
> **Current State:** React web prototype with mock data, no backend
> **Strategy:** Firebase-first approach, then feature-by-feature in priority order
> **Platform Note:** SRS specifies Android native, but this implementation is a React web app. The web prototype covers all functional requirements; native migration (React Native / PWA) can be considered post-completion.

---

## Phase 0: Project Setup & Configuration
**Priority:** CRITICAL | **Estimated Effort:** Foundation for everything

### Tasks
- [ ] **0.1** Install Firebase SDK (`firebase` package)
- [ ] **0.2** Create Firebase project in Firebase Console
- [ ] **0.3** Enable Firebase Authentication (Email/Password + Google Sign-In)
- [ ] **0.4** Create Firestore database with initial security rules
- [ ] **0.5** Enable Firebase Cloud Storage
- [ ] **0.6** Create `services/firebase.ts` — Firebase app initialization & config
- [ ] **0.7** Create `services/firestore.ts` — Firestore helper functions
- [ ] **0.8** Create `services/storage.ts` — Cloud Storage helper functions
- [ ] **0.9** Update `types.ts` — Add Firestore-compatible types (timestamps, refs)
- [ ] **0.10** Set up environment variables (`.env`) for Firebase config keys
- [ ] **0.11** Install `react-router-dom` for proper routing (replace tab-based navigation)
- [ ] **0.12** Choose and install state management approach:
  - Option A: Multiple React Contexts (AuthContext, TripContext, NotificationContext)
  - Option B: Zustand (lightweight, minimal boilerplate)
  - Decision: whichever is chosen, document in this file and use consistently across all phases
- [ ] **0.13** Create `utils/imageUtils.ts` — shared image processing utilities:
  - `compressImage(file, maxWidth, quality)` — client-side compression using Canvas API
  - `generateThumbnail(file, size)` — create thumbnail for gallery display
  - `validateFileSize(file, maxMB)` — enforce 10MB limit (SRS non-functional requirement)
  - Used by both trip cover upload (Phase 2) and media upload (Phase 4)

### Firestore Collections Schema
```
users/
  {userId}/
    name, email, avatar, createdAt

trips/
  {tripId}/
    title, destination, startDate, endDate, description
    ownerId, participantIds[], coverImage, status
    isPublic (boolean — for Explore feed visibility)
    createdAt, updatedAt

    expenses/ (subcollection)
      {expenseId}/
        amount, description, payerId, date, participantIds[]
        createdAt

    media/ (subcollection)
      {mediaId}/
        url, thumbnailUrl, type, uploadedBy
        blockchainHash, isVerified, date

    itinerary/ (subcollection)
      {itemId}/
        title, time, location, notes

invitations/
  {invitationId}/
    tripId, fromUserId, toEmail, status (pending/accepted/declined)
    createdAt

notifications/
  {userId}/
    items/ (subcollection)
      {notificationId}/
        type, message, data, read, createdAt

likes/
  {tripId}/
    {userId}/ — existence = liked

comments/
  {tripId}/
    {commentId}/
      userId, text, createdAt

followers/
  {userId}/
    {followerId}/ — existence = following

verificationLog/
  {logId}/
    mediaId, hash, timestamp, verifiedBy, status
```

### Deliverables
- Firebase project live and configured
- SDK initialized in app
- Firestore rules deployed (initial — refined per phase)
- Environment variables set
- State management approach decided and scaffolded
- Image utility functions ready for use

---

## Phase 1: User Authentication & Routing (REQ-1 to REQ-5)
**Priority:** HIGH | **Depends on:** Phase 0
**SRS Requirements:** REQ-1, REQ-2, REQ-3, REQ-4, REQ-5

### Tasks
- [ ] **1.1** Create `services/authService.ts` with functions:
  - `registerWithEmail(name, email, password)` — Firebase `createUserWithEmailAndPassword`
  - `loginWithEmail(email, password)` — Firebase `signInWithEmailAndPassword`
  - `loginWithGoogle()` — Firebase Google Sign-In provider
  - `resetPassword(email)` — Firebase `sendPasswordResetEmail`
  - `logout()` — Firebase `signOut`
  - `onAuthChange(callback)` — Firebase `onAuthStateChanged` listener
- [ ] **1.2** Create `contexts/AuthContext.tsx` — React Context for auth state
  - Provides `user`, `loading`, `login`, `register`, `logout`, `resetPassword`
  - Wraps entire app to replace prop drilling from App.tsx
- [ ] **1.3** Refactor navigation from tab-state to `react-router-dom`:
  - Define routes: `/login`, `/register`, `/`, `/trip/:id`, `/expenses`, `/maps`, `/gallery`, `/explore`, `/profile`, `/add-trip`, `/notifications`
  - Create `ProtectedRoute` wrapper — redirects to `/login` if not authenticated
  - Update `App.tsx` — replace `activeTab` switch/case with `<Routes>`
  - Update `Layout.tsx` — bottom nav uses `<NavLink>` instead of `setActiveTab`
  - Remove `selectedTrip`, `isAddingTrip`, `activeTab` state from App.tsx
  - Use `useNavigate()` for programmatic navigation
- [ ] **1.4** Update `LoginPage.tsx`:
  - Wire form to `loginWithEmail()` with real email/password state
  - Add Google Sign-In button calling `loginWithGoogle()`
  - Show Firebase error messages (REQ-4) — wrong password, user not found, etc.
  - Add loading spinner during auth
  - Navigate to `/` on successful login
- [ ] **1.5** Update `RegistrationPage.tsx`:
  - Wire form to `registerWithEmail()` with name, email, password
  - Add password strength validation (min 8 chars, uppercase, number)
  - Create user doc in Firestore `users/` collection on successful registration
  - Show error messages for duplicate email, weak password, etc.
  - Navigate to `/` on success
- [ ] **1.6** Implement "Forgot Password?" flow:
  - New modal or `/forgot-password` route with email input
  - Calls `resetPassword(email)` (REQ-3)
  - Show success/error feedback
- [ ] **1.7** Implement session management:
  - Firebase handles persistent sessions automatically
  - Add 30-minute inactivity timeout (REQ-5) using idle timer
  - Auto-logout on timeout with redirect to `/login`
- [ ] **1.8** Update `App.tsx`:
  - Replace `useState` auth with `AuthContext`
  - Remove `MOCK_USER` constant and `INITIAL_MOCK_TRIPS`
  - Use `onAuthStateChanged` for persistent login across refreshes
  - App.tsx becomes a thin shell: AuthProvider → Router → Layout → Routes
- [ ] **1.9** Firestore security rules for auth:
  - Authenticated users only for all read/write operations
  - Users can only modify their own `users/{userId}` document

### Deliverables
- Real email/password registration & login
- Google Sign-In working
- Password reset via email
- Error messages for all auth failures
- 30-min inactivity auto-logout
- Auth state persists across page refreshes
- URL-based routing with protected routes (no more tab-state)

---

## Phase 2: Trip Management CRUD & Role-Based Access (REQ-6 to REQ-10)
**Priority:** HIGH | **Depends on:** Phase 1
**SRS Requirements:** REQ-6, REQ-7, REQ-8, REQ-9, REQ-10, SRS 5.3

### Tasks
- [ ] **2.1** Create `services/tripService.ts`:
  - `createTrip(tripData)` — Add to Firestore `trips/` collection
  - `getTrips(userId)` — Query trips where user is owner or participant
  - `getTrip(tripId)` — Single trip fetch
  - `updateTrip(tripId, data)` — Owner-only update (REQ-7)
  - `deleteTrip(tripId)` — Owner-only delete (REQ-7)
  - `subscribeToTrips(userId, callback)` — Real-time listener with `onSnapshot`
- [ ] **2.2** Define and enforce role-based access (SRS 5.3):
  - **Trip Owner:** full CRUD on trip, can manage participants, can delete any expense/media within trip
  - **Participant:** can view trip, add expenses/media, cannot edit/delete trip or others' content
  - **Non-participant:** no access to private trip data
  - Create helper `getUserRole(trip, userId)` → returns `'owner' | 'participant' | 'none'`
  - Enforce in Firestore security rules:
    - `trips/{tripId}` — write: owner only; read: owner or participantIds contains userId
    - `trips/{tripId}/expenses/{expenseId}` — create: participants; update/delete: payerId or trip owner
    - `trips/{tripId}/media/{mediaId}` — create: participants; delete: uploader or trip owner
  - Enforce in UI: conditionally show/hide edit/delete buttons based on role
- [ ] **2.3** Update `AddTripPage.tsx`:
  - Save to Firestore instead of local state
  - Add proper input validation (REQ-10):
    - Title: required, 3-100 chars
    - Destination: required
    - Dates: start < end, not in the past
    - Description: max 500 chars
  - Show validation errors inline
  - Cover image upload via Firebase Storage using `utils/imageUtils.ts` for compression
  - Navigate to `/trip/:id` on success
- [ ] **2.4** Create `EditTripPage.tsx` (or modal):
  - Pre-filled form with existing trip data
  - Owner-only access check — redirect if not owner (REQ-7)
  - Update Firestore on save
- [ ] **2.5** Add trip deletion:
  - Confirmation dialog before delete
  - Owner-only (REQ-7) — hide delete button for non-owners
  - Cascade delete subcollections (expenses, media, itinerary)
  - Delete associated Storage files (cover image)
  - Navigate to `/` after deletion
- [ ] **2.6** Implement participant invitations (REQ-8):
  - Add "Invite" button on trip detail
  - Search users by email in `users/` collection
  - Store invitation in `invitations/` collection (pending/accepted/declined)
  - Accept/decline invitation flow
  - Update trip `participantIds[]` on accept
  - Show pending invitations on dashboard or notifications
- [ ] **2.7** Update `Dashboard.tsx`:
  - Fetch trips from Firestore via real-time subscription
  - Show real trip count and stats (replace hardcoded "12 trips done", "45 cities")
  - Add trip status filter (draft, active, completed)
  - Show user's name from auth context (replace hardcoded "Welcome back, Traveler!")
- [ ] **2.8** Update `TripDetail.tsx`:
  - Fetch trip from Firestore using route param `tripId`
  - Show edit/delete buttons for trip owner only (role check)
  - Display real participant list with avatars
  - Calculate real trip duration from dates (replace hardcoded "7 Days")
  - Link to trip-specific expenses, gallery, maps pages

### Deliverables
- Full trip CRUD with Firestore persistence
- Data survives page refresh
- Owner-only edit/delete enforcement (UI + security rules)
- Role-based access for owner vs participant vs non-participant
- Input validation with error messages
- Participant invitation system
- Real-time dashboard updates

---

## Phase 3: Expense Tracking (REQ-11 to REQ-15)
**Priority:** HIGH | **Depends on:** Phase 2
**SRS Requirements:** REQ-11, REQ-12, REQ-13, REQ-14, REQ-15

### Tasks
- [ ] **3.1** Fix expense-trip linkage (currently hardcoded to `trips[0]`):
  - `ExpensesPage` must receive trip context from route params (`/trip/:tripId/expenses`)
  - Or: add trip selector dropdown when accessed from bottom nav
  - Ensure expenses are always scoped to a specific trip
- [ ] **3.2** Create `services/expenseService.ts`:
  - `addExpense(tripId, expenseData)` — Add to `trips/{tripId}/expenses/`
  - `getExpenses(tripId)` — Fetch all expenses for a trip
  - `updateExpense(tripId, expenseId, data)` — Edit expense (payer or trip owner only)
  - `deleteExpense(tripId, expenseId)` — Remove expense (payer or trip owner only)
  - `subscribeToExpenses(tripId, callback)` — Real-time listener (REQ-12)
- [ ] **3.3** Create `AddExpenseModal.tsx`:
  - Form: amount (number), description (text), payer (dropdown of participants), split-among (multi-select)
  - Validation (REQ-13):
    - Amount > 0, not negative, not zero
    - Required fields: amount, description, payer
    - At least one participant selected for split
  - Save to Firestore
- [ ] **3.4** Create `EditExpenseModal.tsx`:
  - Pre-filled form for editing existing expense
  - Only payer or trip owner can edit (uses role from Phase 2)
- [ ] **3.5** Update `ExpensesPage.tsx`:
  - Replace hardcoded expenses with Firestore real-time data
  - Wire "+" FAB to `AddExpenseModal`
  - Add delete button per expense (with confirmation)
  - Real-time balance updates (REQ-12) via `onSnapshot`
  - Keep existing pie chart and balance calculation logic (already working)
  - Keep AI expense analysis (Gemini — already working)
- [ ] **3.6** Historical expense retrieval (REQ-14):
  - Expenses persist in Firestore per trip automatically
  - Add date range filter on ExpensesPage
  - Add expense export summary (text format for now; PDF/CSV in Phase 8)
- [ ] **3.7** Wire up expense notifications (REQ-15):
  - On expense add/update/delete → create notification for all trip participants
  - Uses notification service (built in Phase 7, but prepare the trigger points here)
  - For now: store notification docs in Firestore; UI for reading them comes in Phase 7

### Deliverables
- Add/edit/delete expenses with Firestore persistence
- Real-time balance sync across participants
- Input validation (no negative/zero amounts)
- Historical expense data per trip
- Expense pie charts with real data
- Notification trigger points prepared for Phase 7

---

## Phase 4: Media Capture & Gallery (REQ-21 to REQ-25)
**Priority:** MEDIUM | **Depends on:** Phase 2
**SRS Requirements:** REQ-21, REQ-22, REQ-23, REQ-24, REQ-25

### Tasks
- [ ] **4.1** Implement media capture (REQ-21):
  - Wire camera button to device camera via `<input type="file" accept="image/*,video/*" capture="environment">`
  - Also support file picker for gallery selection
  - Show preview/confirmation before upload
- [ ] **4.2** Implement media upload (REQ-22):
  - Compress image using `utils/imageUtils.ts` before upload
  - Upload to Firebase Cloud Storage at path `trips/{tripId}/media/{filename}`
  - Generate and upload thumbnail
  - Store metadata in `trips/{tripId}/media/` subcollection (url, thumbnailUrl, type, uploadedBy, date)
  - Show upload progress bar
  - Enforce 10MB file size limit using `validateFileSize()` (SRS non-functional requirement)
- [ ] **4.3** Update `GalleryPage.tsx` (REQ-23):
  - Receive trip context from route params (`/trip/:tripId/gallery`)
  - Fetch media from Firestore `trips/{tripId}/media/` with real-time listener
  - Replace mock images with real uploaded media
  - Full-screen image/video viewer on tap (lightbox)
  - Media deletion (remove from Storage + Firestore; uploader or trip owner only)
  - Loading skeleton while fetching
  - Empty state when no media
- [ ] **4.4** Update Explore/Public Gallery (REQ-24):
  - Query only `isVerified: true` media across trips where `isPublic: true`
  - Keep existing verified filter tab
- [ ] **4.5** Error handling (REQ-25):
  - Camera permission denied → clear message with instructions
  - Upload failure → retry button with error description
  - File too large → show size limit message before upload attempt
  - Network error → show offline message
  - Unsupported file type → clear rejection message
- [ ] **4.6** Firestore & Storage security rules for media:
  - Upload: trip participants only
  - Read: trip participants (private trip), anyone (public trip + verified)
  - Delete: uploader or trip owner

### Deliverables
- Camera capture for photos/videos
- Upload to Firebase Cloud Storage with compression and progress
- Trip-specific galleries with real media
- Public gallery with verified-only filter
- Error messages for all failure cases

---

## Phase 5: Map & Route Planning (REQ-16 to REQ-20)
**Priority:** MEDIUM | **Depends on:** Phase 0
**SRS Requirements:** REQ-16, REQ-17, REQ-18, REQ-19, REQ-20

> **Note:** This phase can be developed **in parallel** with Phases 1-4 since it only depends on Phase 0.

### Tasks
- [ ] **5.1** Install & configure Google Maps:
  - Add `@vis.gl/react-google-maps` package (or `@react-google-maps/api`)
  - Get Google Maps API key with Maps JavaScript API + Places API + Directions API enabled
  - Add API key to `.env`
- [ ] **5.2** Update `MapsPage.tsx` — Real-time location (REQ-16):
  - Replace static placeholder image with Google Maps component
  - Use `navigator.geolocation.watchPosition()` for real-time user location
  - Show user position marker on map
  - Center map on user's location or trip destination
- [ ] **5.3** Implement destination search (REQ-17):
  - Wire search bar to Google Places Autocomplete API
  - Show search results dropdown
  - Place marker on selected destination
  - Show place details (name, rating, photos)
- [ ] **5.4** Implement route planning (REQ-18):
  - Google Directions API integration
  - Calculate route from current location to destination
  - Show route polyline on map
  - Display distance and estimated time
  - Option to optimize for shortest distance or time
- [ ] **5.5** Nearby attractions:
  - Replace hardcoded "Baltit Fort" / "Eagle's Nest" with Places API nearby search
  - Show real POIs (restaurants, hotels, tourist spots)
  - Distance calculation from user location
- [ ] **5.6** GPS error handling (REQ-20):
  - Location permission denied → clear message with instructions
  - GPS unavailable → fallback to manual location entry
  - Network error → show cached data if available
- [ ] **5.7** Offline support (REQ-19) — **Web platform limitations**:
  - Google Maps JS API does **not** support offline tile caching
  - Cache recent search results and route data in localStorage
  - Cache trip destination coordinates for basic offline reference
  - Show "Offline — limited map functionality" indicator
  - Full offline maps would require native platform (Android) or third-party tile server

### Deliverables
- Real Google Maps with user location
- Place search with autocomplete
- Route planning with directions
- Nearby attractions from Places API
- GPS error handling with clear messages
- Best-effort offline support within web constraints

---

## Phase 6: Blockchain Verification Subsystem (SRS 5.6.6)
**Priority:** MEDIUM | **Depends on:** Phase 4
**SRS Section:** 5.6.6 — HashGenerator, VerificationEngine, BlockchainInterface

### Tasks
- [ ] **6.1** Create `services/blockchainService.ts`:
  - `generateHash(file)` — SHA-256 hash of media file content using Web Crypto API
  - `verifyHash(file, storedHash)` — Compare current hash with stored hash
  - `logVerification(mediaId, hash, timestamp)` — Store verification record in Firestore
- [ ] **6.2** Integrate hashing into media upload flow (Phase 4):
  - On upload → auto-generate SHA-256 hash of the **original** file (before compression)
  - Store hash in media document's `blockchainHash` field
  - Mark `isVerified: true` after hash generation and logging
- [ ] **6.3** Create verification UI:
  - "Verify" button on each media item in gallery
  - Re-hash file and compare with stored hash
  - Show green checkmark (match) or red warning (tampered/mismatch)
  - Show hash details on tap (hash value, verification timestamp, verified by)
- [ ] **6.4** Populate `verificationLog/` Firestore collection:
  - Store: mediaId, hash, timestamp, verifiedBy, status (valid/tampered)
  - Append-only via Firestore security rules (no updates or deletes)
- [ ] **6.5** Update `GalleryPage.tsx`:
  - Show real verification status based on hash comparison
  - Replace hardcoded `isVerified` flags with computed verification
- [ ] **6.6** Update `ExplorePage.tsx`:
  - Public gallery only shows media with valid `blockchainHash`
  - "On-Chain Verified" badge now represents real cryptographic verification

### Deliverables
- SHA-256 hash generation for all uploaded media
- Hash verification (tamper detection)
- Immutable verification log in Firestore
- Real verified badges replacing cosmetic ones
- Public gallery shows genuinely verified content only

---

## Phase 7: Notifications System
**Priority:** HIGH | **Depends on:** Phase 3
**SRS Sections:** REQ-8, REQ-15, SRS 5.5

> **Note:** Role-based access was moved to Phase 2 (task 2.2). This phase focuses solely on the notification system.

### Tasks
- [ ] **7.1** Create `services/notificationService.ts`:
  - `sendNotification(userId, type, message, data)` — Write to `notifications/{userId}/items/`
  - `getNotifications(userId)` — Fetch user's notifications (paginated)
  - `markAsRead(userId, notificationId)` — Update read status
  - `markAllAsRead(userId)` — Batch update
  - `subscribeToNotifications(userId, callback)` — Real-time listener for new notifications
  - `getUnreadCount(userId)` — For badge display
- [ ] **7.2** Create `NotificationsPage.tsx` (route: `/notifications`):
  - List of notifications grouped by date
  - Types: trip invitation, expense added/updated, trip details changed, invitation accepted
  - Unread items visually distinct (bold/highlighted)
  - Mark as read on tap
  - Deep link to relevant trip/expense on tap
  - Empty state when no notifications
- [ ] **7.3** Update `Layout.tsx` — notification badge:
  - Add bell icon in header (next to "+" button)
  - Show unread count badge (real-time via `subscribeToNotifications`)
  - Tap navigates to `/notifications`
- [ ] **7.4** Wire up notification triggers across the app:
  - Trip invitation sent → notify invitee (Phase 2 trigger point)
  - Invitation accepted/declined → notify trip owner
  - Expense added/updated/deleted → notify all trip participants except actor (Phase 3 trigger point)
  - Trip details changed → notify all participants
  - Media uploaded → notify all participants (Phase 4 trigger point)
- [ ] **7.5** Notification cleanup:
  - Auto-delete notifications older than 30 days (Firestore TTL or scheduled function)
  - Or: paginate and lazy-load older notifications

### Deliverables
- In-app notification system with real-time updates
- Unread notification badge in header
- Deep linking from notification to relevant content
- All major events trigger appropriate notifications

---

## Phase 8: Profile, Settings & Report Generation
**Priority:** LOW | **Depends on:** Phase 1, Phase 3
**SRS Section:** 2.2 (Report Generation), Profile

### Tasks
- [ ] **8.1** Update `ProfilePage.tsx`:
  - Fetch real stats from Firestore (trip count, completed trips, total photos)
  - Avatar upload to Firebase Storage using `utils/imageUtils.ts` for compression
  - Edit name functionality (update Firestore `users/` doc + Firebase Auth display name)
  - Show real trip history (list of completed trips)
  - Remove hardcoded "12", "48", "1.2k" stats
- [ ] **8.2** Implement Report Generation (SRS 2.2):
  - Trip summary PDF export (using `jspdf` or `html2canvas`)
  - Expense report CSV export
  - Include: trip details, participant list, expense breakdown, per-person balances
  - Download button on TripDetail page and ExpensesPage
- [ ] **8.3** Settings screen (route: `/settings`):
  - Notification preferences (enable/disable by type)
  - Privacy settings (default trip visibility: public/private)
  - Account deletion (with confirmation — deletes Firestore data + Firebase Auth)
- [ ] **8.4** Wire up Profile menu items:
  - "Notifications" → `/notifications` (Phase 7)
  - "Trust & Safety" → Verification info / blockchain status
  - "Travel Circle" → Friends/connections list (if social features built)
  - "Get Help" → Help/FAQ page or external link

### Deliverables
- Real profile with editable fields and avatar upload
- PDF/CSV report generation and download
- Working settings screen
- Functional profile menu items

---

## Phase 9: Explore & Social Features
**Priority:** LOW | **Depends on:** Phase 6
**SRS Section:** REQ-24, 2.2 (Public Trip Gallery)

> **Note:** This phase requires the extended Firestore schema defined in Phase 0 (likes, comments, followers collections).

### Tasks
- [ ] **9.1** Add trip privacy toggle:
  - Trip owner can set `isPublic: true/false` on trip creation and editing
  - Default: private
  - Public trips appear in Explore feed; private trips do not
- [ ] **9.2** Update `ExplorePage.tsx`:
  - Fetch real public trips from Firestore (`where isPublic == true`)
  - Real user profiles with avatars from `users/` collection
  - Working search (query by destination or trip title using Firestore text search or client-side filter)
- [ ] **9.3** Implement filter functionality:
  - "Trending" — trips with most likes (query `likes/` collection, count per trip)
  - "Verified Only" — trips with blockchain-verified media (has valid `blockchainHash`)
  - "Upcoming" — trips with `startDate` in the future
  - "Creators" — users with most public trips
- [ ] **9.4** Social interactions:
  - Like/unlike trips — toggle doc in `likes/{tripId}/{userId}`
  - Comment on trips — add to `comments/{tripId}/`
  - Share trip link — copy URL to clipboard or Web Share API
  - Follow/unfollow users — toggle doc in `followers/{userId}/{followerId}`
- [ ] **9.5** "Connect" button functionality:
  - Follow user and/or send trip join request
  - Show follower count on profile

### Deliverables
- Real social feed with Firestore data
- Working search and filters
- Like/comment/share functionality
- Public/private trip toggle
- User follow system

---

## Phase 10: Polish, Performance, Deployment & Non-Functional Requirements
**Priority:** MEDIUM | **Depends on:** All previous phases
**SRS Section:** 5.1, 5.2, 5.4

### Tasks

#### Performance (SRS 5.1)
- [ ] **10.1** Lazy loading:
  - React.lazy + Suspense for page-level code splitting
  - Lazy load images with `loading="lazy"` and IntersectionObserver
  - Firestore query pagination (limit + startAfter) for trips, expenses, media, notifications
- [ ] **10.2** Bundle optimization:
  - Vite bundle splitting (vendor chunk, per-route chunks)
  - Analyze bundle size with `rollup-plugin-visualizer`
  - Target: dashboard loads < 2 seconds, CRUD operations < 3 seconds

#### Offline Support (REQ-9, REQ-19)
- [ ] **10.3** Firestore offline persistence:
  - Enable `enableIndexedDbPersistence()` (or `enableMultiTabIndexedDbPersistence()`)
  - Cache trip data for offline viewing (REQ-9)
  - Queue writes when offline, auto-sync when online
  - Show offline/online indicator in UI

#### Error Handling & UX
- [ ] **10.4** Global error handling:
  - React Error Boundary component wrapping main content
  - Toast/snackbar notification system for success/error/warning messages
  - Loading skeletons for all data-fetching pages
  - Empty states for all lists (trips, expenses, media, notifications)

#### Security (SRS 5.3)
- [ ] **10.5** Security hardening:
  - Comprehensive audit of all Firestore security rules (consolidate rules from all phases)
  - Input sanitization on all user-facing forms
  - HTTPS enforcement via Firebase Hosting config
  - Review all `process.env` keys are not exposed to client bundle (except public Firebase config)

#### Firestore Cost Management
- [ ] **10.6** Listener and read optimization:
  - Audit all active `onSnapshot` listeners — ensure cleanup on unmount
  - Limit real-time listeners to active views only (don't listen to all collections simultaneously)
  - Use `getDoc`/`getDocs` for one-time reads where real-time isn't needed
  - Pagination to avoid loading entire collections
  - Monitor Firestore usage in Firebase Console

#### Deployment
- [ ] **10.7** Deploy to Firebase Hosting:
  - `firebase init hosting` — configure build directory (`dist/`)
  - Set up CI/CD with GitHub Actions (optional)
  - Configure custom domain (optional)
  - HTTPS is automatic on Firebase Hosting (SRS 5.3)
  - Test deployed app end-to-end

#### Responsive Design & Accessibility
- [ ] **10.8** Cross-device testing:
  - Test on multiple screen sizes (320px to 1440px)
  - Test on actual mobile devices (Android Chrome, iOS Safari)
  - Keyboard navigation support for all interactive elements
  - ARIA labels on buttons, inputs, and dynamic content

#### Testing
- [ ] **10.9** Test coverage:
  - Unit tests for services (auth, trip, expense, blockchain) using Vitest
  - Integration tests for CRUD flows with Firebase Emulator
  - E2E tests for critical paths (register → create trip → add expense → upload media)
  - Test offline behavior

### Deliverables
- Performance targets met (< 2s dashboard, < 3s CRUD)
- Offline mode working with Firestore persistence
- Comprehensive error handling with user-friendly messages
- Security audit passed on all Firestore rules
- App deployed and accessible via HTTPS
- Firestore cost optimized with proper listener management
- Test coverage for critical paths

---

## Phase Summary

| Phase | Name | Priority | Key SRS Requirements | Depends On |
|-------|------|----------|---------------------|------------|
| 0 | Project Setup, Firebase & Shared Utils | CRITICAL | — | — |
| 1 | User Authentication & Routing | HIGH | REQ-1 to REQ-5 | Phase 0 |
| 2 | Trip Management CRUD & Role-Based Access | HIGH | REQ-6 to REQ-10, SRS 5.3 | Phase 1 |
| 3 | Expense Tracking | HIGH | REQ-11 to REQ-15 | Phase 2 |
| 4 | Media Capture & Gallery | MEDIUM | REQ-21 to REQ-25 | Phase 2 |
| 5 | Map & Route Planning | MEDIUM | REQ-16 to REQ-20 | Phase 0 |
| 6 | Blockchain Verification | MEDIUM | Section 5.6.6 | Phase 4 |
| 7 | Notifications System | HIGH | REQ-8, REQ-15, SRS 5.5 | Phase 3 |
| 8 | Profile & Reports | LOW | Section 2.2 | Phase 1, 3 |
| 9 | Explore & Social | LOW | REQ-24 | Phase 6 |
| 10 | Polish, Deployment & Non-Functional | MEDIUM | Section 5.1-5.5 | All |

### Dependency Graph
```
Phase 0 (Firebase Setup + Shared Utils)
  ├── Phase 1 (Auth + Routing)
  │     └── Phase 2 (Trips + Roles)
  │           ├── Phase 3 (Expenses)
  │           │     └── Phase 7 (Notifications)
  │           │           └── Phase 8 (Profile & Reports)
  │           └── Phase 4 (Media)
  │                 └── Phase 6 (Blockchain)
  │                       └── Phase 9 (Explore & Social)
  └── Phase 5 (Maps) — can run in parallel with Phases 1-4

Phase 10 (Polish & Deployment) — after all phases complete
```

### Parallel Execution Opportunities
- **Phase 5 (Maps)** can be developed in parallel with Phases 1-4 since it only depends on Phase 0
- **Phase 4 (Media)** and **Phase 3 (Expenses)** can run in parallel after Phase 2
- **Phase 8 (Profile)** and **Phase 9 (Explore)** can run in parallel

### Key Changes from Original Plan
1. **Routing refactor** added to Phase 1 (was just "install react-router-dom" with no migration plan)
2. **Role-based access** moved from Phase 7 into Phase 2 (must exist before expenses/media CRUD)
3. **State management** decision added to Phase 0 (avoids prop-drilling chaos mid-project)
4. **Image utilities** shared in Phase 0 (used by both trip covers and media uploads)
5. **Firestore schema extended** in Phase 0 to include social collections (likes, comments, followers, invitations, notifications)
6. **Expense-trip linkage fix** (hardcoded `trips[0]`) moved to first task in Phase 3
7. **Offline maps** scoped to web platform reality (Google Maps JS API cannot cache tiles)
8. **Deployment** added as explicit task in Phase 10 (HTTPS depends on it)
9. **Firestore cost management** added to Phase 10 (multiple onSnapshot listeners need cleanup discipline)
10. **Phase 7** slimmed to notifications only (roles moved to Phase 2)
