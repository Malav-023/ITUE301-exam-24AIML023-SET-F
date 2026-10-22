/**
 * Reusable event card.
 * Required props: title, category, date, venue, ticketsAvailable
 * Optional props: onBook (click handler), selected (highlight)
 */
function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Date to be announced';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

export default function EventCard({ title, category, date, venue, ticketsAvailable, onBook, selected = false }) {
  const soldOut = ticketsAvailable <= 0; // simple conditional drives the footer below

  return (
    <article className={`card${selected ? ' card--selected' : ''}`}>
      <span className="badge badge--category">{category}</span>
      <h3 className="card__title">{title}</h3>
      <dl className="card__meta">
        <div>
          <dt>When</dt>
          <dd>{formatDate(date)}</dd>
        </div>
        <div>
          <dt>Where</dt>
          <dd>{venue}</dd>
        </div>
      </dl>
      <div className="card__footer">
        <span className="muted">
          {ticketsAvailable} ticket{ticketsAvailable === 1 ? '' : 's'} left
        </span>
        {soldOut ? (
          <span className="badge badge--soldout">Sold Out</span>
        ) : (
          <button type="button" className="btn btn--sm" onClick={onBook}>
            Book
          </button>
        )}
      </div>
    </article>
  );
}
