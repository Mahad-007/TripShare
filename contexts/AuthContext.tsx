import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '../types';
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle as loginWithGoogleService,
  resetPassword as resetPasswordService,
  logout as logoutService,
  onAuthChange,
  updateUserProfile,
} from '../services/authService';
import { auth } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function mapFirebaseUser(fbUser: FirebaseUser): User {
  return {
    id: fbUser.uid,
    name: fbUser.displayName || 'User',
    email: fbUser.email || '',
    avatar: fbUser.photoURL || undefined,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = useCallback(async () => {
    await logoutService();
    setUser(null);
  }, []);

  // Inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (user) {
      inactivityTimer.current = setTimeout(() => {
        handleLogout();
      }, INACTIVITY_TIMEOUT);
    }
  }, [user, handleLogout]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [user, resetInactivityTimer]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthChange((fbUser) => {
      setUser(fbUser ? mapFirebaseUser(fbUser) : null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const fbUser = await loginWithEmail(email, password);
    setUser(mapFirebaseUser(fbUser));
  };

  const loginWithGoogle = async () => {
    const fbUser = await loginWithGoogleService();
    setUser(mapFirebaseUser(fbUser));
  };

  const register = async (name: string, email: string, password: string) => {
    const fbUser = await registerWithEmail(name, email, password);
    setUser(mapFirebaseUser(fbUser));
  };

  const resetPassword = async (email: string) => {
    await resetPasswordService(email);
  };

  const updateProfileHandler = async (updates: { displayName?: string; photoURL?: string }) => {
    await updateUserProfile(updates);
    if (auth.currentUser) {
      setUser(mapFirebaseUser(auth.currentUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, resetPassword, updateProfile: updateProfileHandler, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
