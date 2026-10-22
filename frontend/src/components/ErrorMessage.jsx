/** error: { message, requestId? }. requestId links the error to the backend log line. */
export default function ErrorMessage({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert alert--error" role="alert">
      <div>
        <strong>{error.message}</strong>
        {error.requestId && <div className="alert__ref">Reference: {error.requestId}</div>}
      </div>
      {onRetry && (
        <button type="button" className="btn btn--outline btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
