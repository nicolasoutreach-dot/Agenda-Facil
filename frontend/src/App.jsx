import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LandingPage from './features/pages/LandingPage.jsx';
import LoginPage from './features/pages/LoginPage.jsx';
import RegisterPage from './features/auth/pages/RegisterPage.jsx';
import MagicLinkPage from './features/auth/pages/MagicLinkPage.jsx';
import OtpVerificationPage from './features/auth/pages/OtpVerificationPage.jsx';
import Dashboard from './features/dashboard/pages/Dashboard.jsx';
import PublicBookingPage from './features/booking/PublicBookingPage.jsx';
import OnboardingWizardPage from './features/onboarding/pages/OnboardingWizardPage.jsx';

const PrivateRoute = ({ children, allowIncomplete = false }) => {
  const { isLoggedIn, isLoading, user } = useAuth();
  if (isLoading) {
    return null;
  }
  if (!isLoggedIn) {
    return <Navigate to="/auth" replace />;
  }

  if (!allowIncomplete && user?.onboardingIncompleto) {
    return <Navigate to="/onboarding" replace />;
  }

  if (allowIncomplete && user?.onboardingIncompleto === false) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/auth" element={<LoginPage />} />
    <Route path="/auth/magic-link" element={<MagicLinkPage />} />
    <Route path="/auth/verify-otp" element={<OtpVerificationPage />} />
    <Route path="/signup" element={<RegisterPage />} />
    <Route path="/booking" element={<PublicBookingPage />} />
    <Route
      path="/onboarding"
      element={
        <PrivateRoute allowIncomplete>
          <OnboardingWizardPage />
        </PrivateRoute>
      }
    />
    <Route
      path="/dashboard"
      element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      }
    />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
