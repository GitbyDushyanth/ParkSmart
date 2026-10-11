import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { PrivateRoute, AdminRoute, PublicRoute } from './components/ProtectedRoute.jsx';
import Navbar from './components/Navbar.jsx';

import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DriverDashboard from './pages/DriverDashboard.jsx';
import ParkingSlots from './pages/ParkingSlots.jsx';
import MyReservations from './pages/MyReservations.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminSlots from './pages/AdminSlots.jsx';
import AdminReservations from './pages/AdminReservations.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public landing */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth pages — redirect if already logged in */}
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          } />

          {/* User & shared authenticated routes */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <AppLayout>
                <DriverDashboard />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/slots" element={
            <PrivateRoute>
              <AppLayout>
                <ParkingSlots />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/my-reservations" element={
            <PrivateRoute>
              <AppLayout>
                <MyReservations />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <AppLayout>
                <ProfilePage />
              </AppLayout>
            </PrivateRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={
            <AdminRoute>
              <AppLayout>
                <AdminDashboard />
              </AppLayout>
            </AdminRoute>
          } />
          <Route path="/admin/slots" element={
            <AdminRoute>
              <AppLayout>
                <AdminSlots />
              </AppLayout>
            </AdminRoute>
          } />
          <Route path="/admin/reservations" element={
            <AdminRoute>
              <AppLayout>
                <AdminReservations />
              </AppLayout>
            </AdminRoute>
          } />
          <Route path="/admin/users" element={
            <AdminRoute>
              <AppLayout>
                <AdminUsers />
              </AppLayout>
            </AdminRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

