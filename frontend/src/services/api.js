import { loadAuth } from '../utils/authStorage';
import { logger } from '../utils/logger';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN', details, requestId } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId; // quote this when debugging - it matches the backend logs
  }
}

/**
 * Single place for every API call: attaches the token, logs timing, and turns every
 * failure into an ApiError with a human-readable message.
 */
async function request(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = loadAuth()?.token;
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const started = performance.now();
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err; // component unmounted - not an error
    logger.error(`${method} ${path} - network error`, err);
    throw new ApiError('Cannot reach the server. Check that the backend is running and try again.', {
      code: 'NETWORK_ERROR',
    });
  }

  const elapsed = Math.round(performance.now() - started);
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* non-JSON body (e.g. proxy error page) */
  }

  if (!response.ok) {
    const apiErr = payload?.error;
    const error = new ApiError(apiErr?.message || `Request failed (HTTP ${response.status})`, {
      status: response.status,
      code: apiErr?.code || 'HTTP_ERROR',
      details: apiErr?.details,
      requestId: payload?.requestId || response.headers.get('X-Request-Id') || undefined,
    });
    logger.warn(`${method} ${path} -> ${response.status} (${elapsed}ms)`, {
      code: error.code,
      message: error.message,
      requestId: error.requestId,
    });

    // Expired / invalid token on a protected call -> AuthContext logs the user out
    if (response.status === 401 && auth && token) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw error;
  }

  logger.debug(`${method} ${path} -> ${response.status} (${elapsed}ms)`);
  return payload;
}

export const api = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials, auth: false }),
  register: (data) => request('/auth/register', { method: 'POST', body: data, auth: false }),
  getEvents: (signal) => request('/events', { auth: false, signal }),
  createEvent: (data) => request('/events', { method: 'POST', body: data }),
  bookTickets: (data) => request('/tickets', { method: 'POST', body: data }),
  getMyTickets: (signal) => request('/tickets/my', { signal }),
  updateTicketStatus: (id, status) => request(`/tickets/${id}/status`, { method: 'PATCH', body: { status } }),
};
