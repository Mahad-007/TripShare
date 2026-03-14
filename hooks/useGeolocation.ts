
import { useState, useEffect, useCallback, useRef } from 'react';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeolocationState {
  position: LatLng | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  permissionState: PermissionState | null;
  retry: () => void;
}

const ERROR_MESSAGES: Record<number, string> = {
  1: 'Location access was denied. Please enable GPS in your browser settings.',
  2: 'Your location could not be determined. Check that GPS is enabled.',
  3: 'Location request timed out. Please try again.',
};

const NOT_SUPPORTED_MSG = 'Geolocation is not supported by your browser.';

export function useGeolocation(): GeolocationState {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setError(NOT_SUPPORTED_MSG);
      setLoading(false);
      return;
    }

    clearWatch();
    setLoading(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAccuracy(pos.coords.accuracy);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(ERROR_MESSAGES[err.code] || 'An unknown location error occurred.');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  }, [clearWatch]);

  // Query permission state (non-blocking)
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          setPermissionState(status.state);
          status.addEventListener('change', () => setPermissionState(status.state));
        })
        .catch(() => {
          // permissions API not supported on this browser
        });
    }
  }, []);

  // Start watching on mount
  useEffect(() => {
    startWatch();
    return clearWatch;
  }, [startWatch, clearWatch]);

  return { position, accuracy, error, loading, permissionState, retry: startWatch };
}
