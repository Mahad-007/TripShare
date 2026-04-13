export const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Expense {
  id: string;
  tripId: string;
  amount: number;
  description: string;
  payerId: string;
  date: string;
  participants: string[]; // User IDs involved in this expense
  createdBy: string;
  createdAt: string;
}

// Firestore document shape for expenses (no id, no tripId — implicit in subcollection path)
export interface FirestoreExpense {
  amount: number;
  description: string;
  payerId: string;
  date: string;
  participants: string[];
  createdBy: string;
  createdAt: string;
}

// Form input shape for expenses
export interface ExpenseFormData {
  amount: number;
  description: string;
  payerId: string;
  date: string;
  participants: string[];
}

export interface Media {
  id: string;
  tripId: string;
  url: string;
  thumbnailUrl: string;
  storagePath?: string;
  type: 'image' | 'video';
  caption: string;
  uploadedBy: string;
  blockchainHash?: string;
  isVerified: boolean;
  isPublic: boolean;
  // Denormalized trip fields — allow Explore (collectionGroup) to render
  // a public photo from a private trip without reading the parent trip doc.
  tripTitle?: string;
  tripDestination?: string;
  tripOwnerId?: string;
  date: string;
  createdAt: string;
}

// Firestore document shape for media (no id, no tripId — implicit in subcollection path)
export interface FirestoreMedia {
  url: string;
  thumbnailUrl: string;
  storagePath?: string;
  type: 'image' | 'video';
  caption: string;
  uploadedBy: string;
  blockchainHash?: string;
  isVerified: boolean;
  isPublic: boolean;
  tripTitle?: string;
  tripDestination?: string;
  tripOwnerId?: string;
  date: string;
  createdAt: string;
}

// Form input shape for media upload
export interface MediaFormData {
  file: File;
  caption: string;
  date: string;
  isPublic: boolean;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string;
  ownerId: string;
  participants: User[];
  participantIds: string[];
  coverImage: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  isPublic: boolean;
  inviteCode?: string;
  createdAt: string;
  updatedAt: string;
}

// Firestore document shape (without the auto-generated id)
export interface FirestoreTrip {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string;
  ownerId: string;
  participantIds: string[];
  coverImage: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  isPublic: boolean;
  inviteCode?: string;
  createdAt: string;
  updatedAt: string;
}

// Form submission shape
export interface TripFormData {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string;
  coverImage: string;
  isPublic?: boolean;
}

export interface ItineraryItem {
  id: string;
  tripId: string;
  title: string;
  time: string;
  location: string;
  notes?: string;
}

export interface VerificationResult {
  status: 'valid' | 'tampered' | 'error' | 'no_hash';
  currentHash?: string;
  storedHash?: string;
  message: string;
  timestamp: string;
}

export interface VerificationLogEntry {
  id: string;
  mediaId: string;
  tripId: string;
  hash: string;
  verifiedBy: string;
  status: 'initial' | 'valid' | 'tampered' | 'error' | 'hash_generated';
  timestamp: string;
}

export interface FirestoreVerificationLog {
  mediaId: string;
  tripId: string;
  hash: string;
  verifiedBy: string;
  status: 'initial' | 'valid' | 'tampered' | 'error' | 'hash_generated';
  timestamp: string;
}

export interface Invitation {
  id: string;
  tripId: string;
  tripTitle: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface FirestoreInvitation {
  tripId: string;
  tripTitle: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export type NotificationType =
  | 'invitation'
  | 'invitation_accepted'
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'media_uploaded'
  | 'new_follower';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
}

export interface FirestoreNotification {
  type: NotificationType;
  message: string;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
}
