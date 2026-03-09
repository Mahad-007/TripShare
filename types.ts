
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
  coverImage: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
}

export interface ItineraryItem {
  id: string;
  tripId: string;
  title: string;
  time: string;
  location: string;
  notes?: string;
}
