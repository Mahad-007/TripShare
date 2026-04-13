import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tripshare.app',
  appName: 'TripShare',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'firebasestorage.googleapis.com',
      '*.firebasestorage.app',
      '*.googleapis.com',
    ],
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '443890392011-oqek5dk2sihotamc2t3lddhs4h4864ug.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
