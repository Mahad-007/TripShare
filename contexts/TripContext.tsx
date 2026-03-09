import React, { createContext, useContext, useState } from 'react';
import { Trip, User } from '../types';
import { useAuth } from './AuthContext';

const MOCK_OWNER: User = { id: 'u1', name: 'Ehtisham Ali', email: 'ea9773520@gmail.com', avatar: 'https://picsum.photos/seed/user1/100/100' };

const INITIAL_MOCK_TRIPS: Trip[] = [
  {
    id: 't1',
    title: 'Northern Adventure',
    destination: 'Hunza Valley',
    startDate: '2024-06-15',
    endDate: '2024-06-22',
    description: 'A deep dive into the Karakoram mountains.',
    ownerId: 'u1',
    participants: [MOCK_OWNER, { id: 'u2', name: 'Zohaib Hassan', email: 'cheema@gmail.com' }],
    coverImage: 'https://images.unsplash.com/photo-1548062005-e50d0639138c?auto=format&fit=crop&q=80&w=800',
    status: 'active',
  },
  {
    id: 't2',
    title: 'Lahore Food Crawl',
    destination: 'Lahore, Pakistan',
    startDate: '2024-03-10',
    endDate: '2024-03-12',
    description: 'Exploring the best street food in the world.',
    ownerId: 'u1',
    participants: [MOCK_OWNER],
    coverImage: 'https://images.unsplash.com/photo-1622549042981-482fb3322421?auto=format&fit=crop&q=80&w=800',
    status: 'completed',
  },
];

interface TripContextType {
  trips: Trip[];
  addTrip: (newTrip: Omit<Trip, 'id' | 'ownerId' | 'participants' | 'status'>) => void;
}

const TripContext = createContext<TripContextType | null>(null);

export const TripProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trips, setTrips] = useState<Trip[]>(INITIAL_MOCK_TRIPS);
  const { user } = useAuth();

  const addTrip = (newTrip: Omit<Trip, 'id' | 'ownerId' | 'participants' | 'status'>) => {
    const trip: Trip = {
      ...newTrip,
      id: `t${Date.now()}`,
      ownerId: user?.id || 'u1',
      participants: user ? [user] : [MOCK_OWNER],
      status: 'draft',
    };
    setTrips((prev) => [trip, ...prev]);
  };

  return (
    <TripContext.Provider value={{ trips, addTrip }}>
      {children}
    </TripContext.Provider>
  );
};

export function useTrips(): TripContextType {
  const context = useContext(TripContext);
  if (!context) throw new Error('useTrips must be used within TripProvider');
  return context;
}
