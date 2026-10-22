import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkClass = ({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`;

export default function Navbar() {
  const { attendee, role, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="nav">
      <div className="container nav__inner">
        <span className="nav__brand">EventHub</span>
        <nav className="nav__links" aria-label="Main">
          {!isAuthenticated && (
            <NavLink to="/" end className={linkClass}>
              Login
            </NavLink>
          )}
          <NavLink to="/events" className={linkClass}>
            Events
          </NavLink>
          <NavLink to="/my-tickets" className={linkClass}>
            My Tickets
          </NavLink>
          {/* Visible to everyone; ProtectedRoute decides who may actually enter */}
          <NavLink to="/organizer" className={linkClass}>
            Organizer
          </NavLink>
        </nav>
        {isAuthenticated && (
          <div className="nav__user">
            <span className="nav__who" title={attendee?.email}>
              {attendee?.name} <span className="badge badge--role">{role}</span>
            </span>
            <button type="button" className="btn btn--outline btn--sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
