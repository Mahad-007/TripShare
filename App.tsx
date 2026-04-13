
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TripProvider } from './contexts/TripContext';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const TripDetail = React.lazy(() => import('./pages/TripDetail'));
const AddTripPage = React.lazy(() => import('./pages/AddTripPage'));
const EditTripPage = React.lazy(() => import('./pages/EditTripPage'));
const ExpensesPage = React.lazy(() => import('./pages/ExpensesPage'));
const MapsPage = React.lazy(() => import('./pages/MapsPage'));
const GalleryPage = React.lazy(() => import('./pages/GalleryPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const ExplorePage = React.lazy(() => import('./pages/ExplorePage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const TravelCirclePage = React.lazy(() => import('./pages/TravelCirclePage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegistrationPage = React.lazy(() => import('./pages/RegistrationPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-200 border-t-teal-600"></div>
  </div>
);

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <TripProvider>
            <ToastProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegistrationPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                  {/* Protected routes with Layout */}
                  <Route
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="trip/:tripId" element={<TripDetail />} />
                    <Route path="add-trip" element={<AddTripPage />} />
                    <Route path="edit-trip/:tripId" element={<EditTripPage />} />
                    <Route path="expenses" element={<ExpensesPage />} />
                    <Route path="maps" element={<MapsPage />} />
                    <Route path="gallery" element={<GalleryPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="explore" element={<ExplorePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="travel-circle" element={<TravelCirclePage />} />
                  </Route>

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ToastProvider>
          </TripProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
