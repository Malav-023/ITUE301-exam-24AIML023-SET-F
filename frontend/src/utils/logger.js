/**
 * Small console logger with an in-memory history, for debugging.
 * In the browser console run:  __eventhubLogs()   to see the last 200 entries.
 * Level is controlled by VITE_LOG_LEVEL (debug | info | warn | error).
 */
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = import.meta.env.VITE_LOG_LEVEL || (import.meta.env.DEV ? 'debug' : 'warn');
const MAX_HISTORY = 200;
const history = [];

function log(level, message, meta) {
  history.push({ time: new Date().toISOString(), level, message, meta });
  if (history.length > MAX_HISTORY) history.shift();

  if (LEVELS[level] < (LEVELS[MIN_LEVEL] ?? 0)) return;

  const fn = console[level] || console.log;
  if (meta !== undefined) fn(`[EventHub] ${message}`, meta);
  else fn(`[EventHub] ${message}`);
}

export const logger = {
  debug: (message, meta) => log('debug', message, meta),
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
  history: () => [...history],
};

if (typeof window !== 'undefined') {
  window.__eventhubLogs = () => logger.history();
}
