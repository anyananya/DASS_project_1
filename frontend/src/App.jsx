import { useState } from 'react'
import './App.css'

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ChangePassword from './pages/auth/ChangePassword';
import TeamInviteAccept from './pages/auth/TeamInviteAccept';

// Participant Pages
import ParticipantDashboard from './pages/participant/Dashboard';
import BrowseEvents from './pages/participant/BrowseEvents';
import EventDetails from './pages/participant/EventDetails';
import Ticket from './pages/participant/Ticket';
import Profile from './pages/Profile';
import Clubs from './pages/participant/Clubs';
import OrganizerDetail from './pages/participant/OrganizerDetail';

// Organizer Pages
import OrganizerDashboard from './pages/organizer/Dashboard';
import CreateEvent from './pages/organizer/CreateEvent';
import AttendanceScanner from './pages/organizer/AttendanceScanner';
import OrdersApproval from './pages/organizer/OrdersApproval';
import OrganizerEventDetail from './pages/organizer/EventDetail';
import AttendanceLogs from './pages/organizer/AttendanceLogs';
import CreateTeam from './pages/organizer/CreateTeam';
import TeamDashboard from './pages/organizer/TeamDashboard';
import TeamChat from './pages/organizer/TeamChat';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';

function App() {
  const [count, setCount] = useState(0)

    return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/team/invite/:code" element={<TeamInviteAccept />} />

            {/* Participant Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['participant']}>
                  <ParticipantDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/browse-events"
              element={
                <ProtectedRoute allowedRoles={['participant']}>
                  <BrowseEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clubs"
              element={
                <ProtectedRoute allowedRoles={['participant']}>
                  <Clubs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizers/:id"
              element={
                <ProtectedRoute allowedRoles={['participant']}>
                  <OrganizerDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={['participant','organizer','admin']}>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:id"
              element={
                <ProtectedRoute allowedRoles={['participant']}>
                  <EventDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ticket/:ticketId"
              element={
                <ProtectedRoute allowedRoles={['participant', 'organizer']}>
                  <Ticket />
                </ProtectedRoute>
              }
            />

            {/* Organizer Routes */}
            <Route
              path="/organizer/dashboard"
              element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <OrganizerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/attendance"
              element={
                <ProtectedRoute allowedRoles={["organizer"]}>
                  <AttendanceScanner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/create-team/:id"
              element={
                <ProtectedRoute allowedRoles={["organizer", "participant"]}>
                  <CreateTeam />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/team/:id"
              element={
                <ProtectedRoute allowedRoles={["organizer","participant"]}>
                  <TeamDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/team/:id/chat"
              element={
                <ProtectedRoute allowedRoles={["organizer","participant"]}>
                  <TeamChat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/orders"
              element={
                <ProtectedRoute allowedRoles={["organizer"]}>
                  <OrdersApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/:id"
              element={
                <ProtectedRoute allowedRoles={["organizer"]}>
                  <OrganizerEventDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/:id/edit"
              element={
                <ProtectedRoute allowedRoles={["organizer"]}>
                  <CreateEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/attendance-logs"
              element={
                <ProtectedRoute allowedRoles={["organizer"]}>
                  <AttendanceLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/create-event"
              element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <CreateEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}


export default App
