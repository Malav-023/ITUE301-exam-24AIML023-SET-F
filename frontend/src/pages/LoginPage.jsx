import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import ErrorMessage from '../components/ErrorMessage';

const EMPTY_FORM = { name: '', email: '', phone: '', password: '' };

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (isAuthenticated) return <Navigate to="/events" replace />;

  const isRegister = mode === 'register';
  const redirectTo = location.state?.from?.pathname || '/events';

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const switchMode = () => {
    setMode(isRegister ? 'login' : 'register');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = isRegister
        ? await api.register(form)
        : await api.login({ email: form.email, password: form.password });
      login(res.data);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const detail = err.details?.map((d) => d.message).join('. ');
      setError({ message: detail || err.message, requestId: err.requestId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth">
      <h1>{isRegister ? 'Create your account' : 'Log in to EventHub'}</h1>
      <p className="muted">Browse events, book tickets and manage your bookings.</p>

      <form className="form panel" onSubmit={handleSubmit} noValidate>
        <ErrorMessage error={error} />

        {isRegister && (
          <label className="field">
            Full name
            <input name="name" value={form.name} onChange={handleChange} autoComplete="name" required />
          </label>
        )}

        <label className="field">
          Email
          <input type="email" name="email" value={form.email} onChange={handleChange} autoComplete="email" required />
        </label>

        {isRegister && (
          <label className="field">
            Phone (optional)
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} autoComplete="tel" />
          </label>
        )}

        <label className="field">
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={6}
            required
          />
        </label>

        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Please wait...' : isRegister ? 'Create account' : 'Log in'}
        </button>

        <p className="muted center">
          {isRegister ? 'Already have an account?' : 'New to EventHub?'}{' '}
          <button type="button" className="link" onClick={switchMode}>
            {isRegister ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </form>

      {import.meta.env.DEV && (
        <p className="muted hint">
          Demo accounts after <code>npm run seed</code> (password <code>Password@123</code>): attendee@eventhub.test,
          organizer@eventhub.test, admin@eventhub.test
        </p>
      )}
    </section>
  );
}
