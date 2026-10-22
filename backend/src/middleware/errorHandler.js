const AppError = require('../utils/AppError');
const logger = require('../config/logger');

/**
 * Global error handler (must be the LAST middleware).
 * Always answers with structured JSON - never a raw stack trace:
 *   { success:false, error:{ code, message, details? }, requestId }
 * Full details + stack go to the log files, keyed by requestId.
 */
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong on our side. Please try again.';
  let details;

  if (err instanceof AppError) {
    ({ statusCode: status, code, message, details } = err);
  } else if (err.name === 'ValidationError') {
    // Mongoose schema validation (required, enum, min, ...)
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.name === 'CastError' ? `Invalid value for ${e.path}` : e.message,
    }));
  } else if (err.name === 'CastError') {
    status = 400;
    code = 'INVALID_ID';
    message = `Invalid value for "${err.path}"`;
  } else if (err.code === 11000) {
    status = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists`;
    details = [{ field, message }];
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    code = 'TOKEN_INVALID';
    message = 'Invalid or expired token.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Request body is not valid JSON';
  }

  const context = {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
    status,
    code,
    bodyKeys: Object.keys(req.body || {}), // keys only - never log values (passwords!)
  };

  if (status >= 500) {
    logger.error(err.message || 'Unhandled error', { ...context, stack: err.stack });
  } else {
    logger.warn(`${code}: ${message}`, { ...context, details });
  }

  res.status(status).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
    requestId: req.id,
  });
};
