import { useCallback, useEffect, useState } from 'react';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { api } from '../services/api';
import { logger } from '../utils/logger';

const EMPTY_FORM = { title: '', category: '', date: '', venue: '', ticketsAvailable: '' };

// Default export is required for React.lazy
export default function OrganizerPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadEvents = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getEvents(signal);
      setEvents(res.data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      logger.error('Organizer: failed to load events', err);
      setError({ message: err.message, requestId: err.requestId });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadEvents(controller.signal);
    return () => controller.abort();
  }, [loadEvents]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setSuccess(null);
    try {
      const res = await api.createEvent({
        title: form.title,
        category: form.category || undefined,
        date: form.date ? new Date(form.date).toISOString() : '',
        venue: form.venue,
        ticketsAvailable: form.ticketsAvailable === '' ? undefined : Number(form.ticketsAvailable),
      });
      setEvents((prev) => [...prev, res.data].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setSuccess(`Created "${res.data.title}".`);
      setForm(EMPTY_FORM);
    } catch (err) {
      const detail = err.details?.map((d) => d.message).join('. ');
      setFormError({ message: detail || err.message, requestId: err.requestId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <h1>Organizer panel</h1>

      <form className="panel form" onSubmit={handleSubmit} noValidate>
        <h2>Create an event</h2>
        <ErrorMessage error={formError} />
        {success && (
          <div className="alert alert--success" role="status">
            {success}
          </div>
        )}
        <div className="form__grid">
          <label className="field">
            Title
            <input name="title" value={form.title} onChange={handleChange} required />
          </label>
          <label className="field">
            Category
            <input name="category" value={form.category} onChange={handleChange} placeholder="e.g. Music" />
          </label>
          <label className="field">
            Date and time
            <input type="datetime-local" name="date" value={form.date} onChange={handleChange} required />
          </label>
          <label className="field">
            Venue
            <input name="venue" value={form.venue} onChange={handleChange} required />
          </label>
          <label className="field">
            Tickets available
            <input type="number" min="0" name="ticketsAvailable" value={form.ticketsAvailable} onChange={handleChange} required />
          </label>
        </div>
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create event'}
        </button>
      </form>

      <h2>All events</h2>
      {loading && <Loader label="Loading events..." />}
      {!loading && error && <ErrorMessage error={error} onRetry={() => loadEvents()} />}
      {!loading && !error && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Date</th>
                <th>Venue</th>
                <th className="num">Tickets left</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev._id}>
                  <td>{ev.title}</td>
                  <td>{ev.category}</td>
                  <td>{new Date(ev.date).toLocaleString()}</td>
                  <td>{ev.venue}</td>
                  <td className="num">{ev.ticketsAvailable}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    No events yet. Create the first one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
