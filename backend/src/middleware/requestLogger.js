const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * Global request logger.
 *  - On arrival:   [METHOD] [PATH] [TIMESTAMP]
 *  - On response:  METHOD PATH -> STATUS (duration)
 * Every request gets an id (also returned in the X-Request-Id header) so a
 * failing request seen in the browser can be traced in the log files.
 */
module.exports = (req, res, next) => {
  const start = process.hrtime.bigint();
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);

  logger.info(`[${req.method}] [${req.originalUrl}] [${new Date().toISOString()}]`, { requestId: req.id });

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)}ms)`, {
      requestId: req.id,
      userId: req.user?.id,
    });
  });

  next();
};
