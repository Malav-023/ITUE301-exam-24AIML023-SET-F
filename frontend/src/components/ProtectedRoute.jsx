import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

/**
 * Two different failures, two different redirects (easy to explain in viva):
 *   1. No token            -> "/"        (go and log in)
 *   2. Token, wrong role   -> "/events"  (stay logged in, just not allowed here)
 */
export default function ProtectedRoute({ children, roles }) {
  const { token, role } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(role)) {
    logger.warn(`Role "${role}" not allowed on ${location.pathname}; redirecting to /events`);
    return <Navigate to="/events" replace />;
  }

  return children;
}
