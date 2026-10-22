import { logger } from './logger';

const KEY = 'eventhub_auth';

export const loadAuth = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn('Could not read saved session - ignoring it', err);
    return null;
  }
};

export const saveAuth = (auth) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(auth));
  } catch (err) {
    logger.warn('Could not save session (storage unavailable?)', err);
  }
};

export const clearAuth = () => {
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    logger.warn('Could not clear saved session', err);
  }
};
