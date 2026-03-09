import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Trip, TripFormData, FirestoreTrip } from '../types';
import { useAuth } from './AuthContext';
import {
  createTrip as createTripService,
  updateTrip as updateTripService,
  deleteTrip as deleteTripService,
  getTripById as getTripByIdService,
  subscribeToUserTrips,
  clearUserCache,
} from '../services/tripService';

interface TripContextType {
  trips: Trip[];
  loading: boolean;
  addTrip: (data: TripFormData) => Promise<string>;
  updateTrip: (tripId: string, data: Partial<FirestoreTrip>) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  getTripById: (tripId: string) => Trip | undefined;
  refreshTrip: (tripId: string) => Promise<Trip | null>;
}

const TripContext = createContext<TripContextType | null>(null);

export const TripProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      clearUserCache();
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUserTrips(user.id, (newTrips) => {
      setTrips(newTrips);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addTrip = useCallback(async (data: TripFormData): Promise<string> => {
    if (!user) throw new Error('Must be logged in to create a trip');
    return createTripService(data, user.id);
  }, [user]);

  const updateTrip = useCallback(async (tripId: string, data: Partial<FirestoreTrip>): Promise<void> => {
    await updateTripService(tripId, data);
  }, []);

  const deleteTrip = useCallback(async (tripId: string): Promise<void> => {
    await deleteTripService(tripId);
  }, []);

  const getTripById = useCallback((tripId: string): Trip | undefined => {
    return trips.find((t) => t.id === tripId);
  }, [trips]);

  const refreshTrip = useCallback(async (tripId: string): Promise<Trip | null> => {
    return getTripByIdService(tripId);
  }, []);

  return (
    <TripContext.Provider value={{ trips, loading, addTrip, updateTrip, deleteTrip, getTripById, refreshTrip }}>
      {children}
    </TripContext.Provider>
  );
};

export function useTrips(): TripContextType {
  const context = useContext(TripContext);
  if (!context) throw new Error('useTrips must be used within TripProvider');
  return context;
}
