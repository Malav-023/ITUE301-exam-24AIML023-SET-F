import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { api } from '../services/api';
import { logger } from '../utils/logger';

const formatDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
};

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadTickets = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMyTickets(signal);
      setTickets(res.data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      logger.error('Failed to load tickets', err);
      setError({ message: err.message, requestId: err.requestId });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadTickets(controller.signal);
    return () => controller.abort();
  }, [loadTickets]);

  const handleCancel = async (ticket) => {
    const name = ticket.eventId?.title || 'this event';
    if (!window.confirm(`Cancel ${ticket.quantity} ticket(s) for ${name}?`)) return;

    setBusyId(ticket._id);
    setActionError(null);
    try {
      const res = await api.updateTicketStatus(ticket._id, 'cancelled');
      setTickets((prev) => prev.map((t) => (t._id === ticket._id ? { ...t, status: res.data.status } : t)));
    } catch (err) {
      setActionError({ message: err.message, requestId: err.requestId });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <h1>My Tickets</h1>

      {loading && <Loader label="Loading your tickets..." />}
      {!loading && error && <ErrorMessage error={error} onRetry={() => loadTickets()} />}

      {!loading && !error && (
        <>
          <ErrorMessage error={actionError} />
          {tickets.length === 0 ? (
            <p className="empty">
              You have no tickets yet. <Link to="/events" className="link">Browse events</Link>
            </p>
          ) : (
            <ul className="list">
              {tickets.map((t) => (
                <li key={t._id} className="panel ticket">
                  <div className="ticket__main">
                    <h3 className="card__title">{t.eventId?.title || 'Event no longer available'}</h3>
                    {t.eventId && (
                      <p className="muted">
                        {formatDate(t.eventId.date)} at {t.eventId.venue}
                      </p>
                    )}
                    <p className="muted">
                      {t.quantity} ticket{t.quantity === 1 ? '' : 's'} · booked {formatDate(t.bookingDate)}
                      {t.attendeeId?.name ? ` by ${t.attendeeId.name}` : ''}
                    </p>
                  </div>
                  <div className="ticket__side">
                    <span className={`badge badge--status badge--${t.status}`}>{t.status}</span>
                    {t.status === 'booked' && (
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        disabled={busyId === t._id}
                        onClick={() => handleCancel(t)}
                      >
                        {busyId === t._id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
