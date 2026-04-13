import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useToast } from './useToast';

const TAB_ROUTES = ['/explore', '/expenses', '/gallery', '/profile'];
const EXIT_THRESHOLD = 2000;

export function useBackButton(): void {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const locationRef = useRef(location);
  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const handleBackButton = useCallback(() => {
    const currentPath = locationRef.current.pathname;

    if (currentPath === '/') {
      // Already on home — double-press to exit
      const now = Date.now();
      if (now - lastBackPressRef.current < EXIT_THRESHOLD) {
        App.minimizeApp();
      } else {
        lastBackPressRef.current = now;
        showToast('Press back again to exit', 'info');
      }
    } else if (TAB_ROUTES.includes(currentPath)) {
      // On a non-home tab — go to home
      navigate('/');
    } else {
      // On a nested page — go back in history
      navigate(-1);
    }
  }, [navigate, showToast]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener('backButton', handleBackButton);

    return () => {
      listener.then((handle) => handle.remove());
    };
  }, [handleBackButton]);
}
