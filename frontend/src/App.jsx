import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Loader from './components/Loader';
import LoginPage from './pages/LoginPage';
import EventsPage from './pages/EventsPage';
import MyTicketsPage from './pages/MyTicketsPage';

// Lazy-loaded: this chunk is only downloaded when someone opens /organizer
const OrganizerPanel = lazy(() => import('./pages/OrganizerPanel'));

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container page">
        <Suspense fallback={<Loader label="Loading organizer panel..." />}>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <EventsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-tickets"
              element={
                <ProtectedRoute>
                  <MyTicketsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer"
              element={
                <ProtectedRoute roles={['organizer', 'admin']}>
                  <OrganizerPanel />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}
