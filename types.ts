
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
  type: 'image' | 'video';
  uploadedBy: string;
  blockchainHash?: string;
  isVerified: boolean;
  date: string;
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
