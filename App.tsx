
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TripProvider } from './contexts/TripContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TripDetail from './pages/TripDetail';
import AddTripPage from './pages/AddTripPage';
import ExpensesPage from './pages/ExpensesPage';
import MapsPage from './pages/MapsPage';
import GalleryPage from './pages/GalleryPage';
import ProfilePage from './pages/ProfilePage';
import ExplorePage from './pages/ExplorePage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import EditTripPage from './pages/EditTripPage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import TravelCirclePage from './pages/TravelCirclePage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TripProvider>
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
        </TripProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
