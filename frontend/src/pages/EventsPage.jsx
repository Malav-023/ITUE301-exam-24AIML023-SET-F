import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import EventCard from '../components/EventCard';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { api } from '../services/api';
import { logger } from '../utils/logger';

export default function EventsPage() {
  // --- data from API (Task 4) ---
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- client-side search ---
  const [search, setSearch] = useState('');

  // --- booking form (Task 2) ---
  const [selectedEventId, setSelectedEventId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [booking, setBooking] = useState({ submitting: false, error: null, success: null });
  const formRef = useRef(null);

  const loadEvents = useCallback(async (signal, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await api.getEvents(signal);
      setEvents(res.data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      logger.error('Failed to load events', err);
      setError({ message: err.message, requestId: err.requestId });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  // Runs once on mount; aborts the request if the page is left early
  useEffect(() => {
    const controller = new AbortController();
    loadEvents(controller.signal);
    return () => controller.abort();
  }, [loadEvents]);

  // Derived on every render - no extra API call
  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? events.filter((e) => e.title.toLowerCase().includes(term)) : events;
  }, [events, search]);

  const bookableEvents = events.filter((e) => e.ticketsAvailable > 0);
  const selectedEvent = events.find((e) => e._id === selectedEventId) || null;

  const handleBookClick = (eventId) => {
    setSelectedEventId(eventId);
    setQuantity(1);
    setBooking({ submitting: false, error: null, success: null });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(quantity);
    const fail = (message) => setBooking({ submitting: false, error: { message }, success: null });

    if (!selectedEvent) return fail('Choose an event to book.');
    if (!Number.isInteger(qty) || qty < 1) return fail('Quantity must be a whole number of at least 1.');
    if (qty > selectedEvent.ticketsAvailable) {
      return fail(`Only ${selectedEvent.ticketsAvailable} ticket(s) left for this event.`);
    }

    setBooking({ submitting: true, error: null, success: null });
    try {
      const res = await api.bookTickets({ eventId: selectedEvent._id, quantity: qty });
      const updated = res.data.event;
      setEvents((prev) => prev.map((ev) => (ev._id === updated._id ? updated : ev)));
      setBooking({
        submitting: false,
        error: null,
        success: `Booked ${qty} ticket${qty > 1 ? 's' : ''} for ${selectedEvent.title}.`,
      });
      setQuantity(1);
      if (updated.ticketsAvailable === 0) setSelectedEventId('');
    } catch (err) {
      logger.warn('Booking failed', { code: err.code, message: err.message });
      setBooking({ submitting: false, error: { message: err.message, requestId: err.requestId }, success: null });
      // Someone else may have taken tickets - refresh availability quietly
      if (err.code === 'INSUFFICIENT_TICKETS') loadEvents(undefined, { silent: true });
    }
  };

  return (
    <section>
      <h1>Events</h1>

      {loading && <Loader label="Loading events..." />}
      {!loading && error && <ErrorMessage error={error} onRetry={() => loadEvents()} />}

      {!loading && !error && (
        <>
          <form className="panel form form--inline" onSubmit={handleSubmit} ref={formRef} noValidate>
            <h2>Book tickets</h2>
            <div className="form__row">
              <label className="field field--grow">
                Event
                <select value={selectedEventId} onChange={(e) => handleBookClick(e.target.value)}>
                  <option value="">Select an event</option>
                  {bookableEvents.map((ev) => (
                    <option key={ev._id} value={ev._id}>
                      {ev.title} ({ev.ticketsAvailable} left)
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field--qty">
                Quantity
                <input
                  type="number"
                  min="1"
                  max={selectedEvent?.ticketsAvailable || undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </label>
              <button type="submit" className="btn" disabled={booking.submitting || !selectedEvent}>
                {booking.submitting ? 'Booking...' : 'Book tickets'}
              </button>
            </div>

            <ErrorMessage error={booking.error} />
            {booking.success && (
              <div className="alert alert--success" role="status">
                <span>{booking.success}</span>
                <Link to="/my-tickets" className="link">
                  View my tickets
                </Link>
              </div>
            )}
          </form>

          <div className="toolbar">
            <label className="field field--grow">
              <span className="sr-only">Search events by title</span>
              <input
                type="search"
                placeholder="Search events by title"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <span className="muted">
              {filteredEvents.length} of {events.length} event{events.length === 1 ? '' : 's'}
            </span>
          </div>

          {events.length === 0 ? (
            <p className="empty">No events yet. Check back soon.</p>
          ) : filteredEvents.length === 0 ? (
            <p className="empty">No events match "{search}". Try a different title.</p>
          ) : (
            <div className="grid">
              {filteredEvents.map((ev) => (
                <EventCard
                  key={ev._id}
                  title={ev.title}
                  category={ev.category}
                  date={ev.date}
                  venue={ev.venue}
                  ticketsAvailable={ev.ticketsAvailable}
                  selected={ev._id === selectedEventId}
                  onBook={() => handleBookClick(ev._id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
