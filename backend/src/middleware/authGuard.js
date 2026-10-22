const jwt = require('jsonwebtoken');
const Attendee = require('../models/Attendee');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * authGuard: validates "Authorization: Bearer <token>".
 * Responds 401 if the token is missing, malformed, invalid, expired,
 * or the account no longer exists. On success sets req.user.
 */
const authGuard = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Authentication required. Send "Authorization: Bearer <token>".', 'TOKEN_MISSING');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    throw new AppError(
      401,
      expired ? 'Your session has expired. Please log in again.' : 'Invalid token.',
      expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
    );
  }

  const attendee = await Attendee.findById(payload.sub).select('name email role');
  if (!attendee) {
    throw new AppError(401, 'This account no longer exists.', 'USER_NOT_FOUND');
  }

  // Role is read from the DB (not the token) so role changes apply immediately
  req.user = { id: attendee.id, name: attendee.name, email: attendee.email, role: attendee.role };
  next();
});

/** authorize('organizer','admin') -> 403 unless req.user.role is listed. Use after authGuard. */
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to do this.', 'FORBIDDEN'));
    }
    next();
  };

module.exports = authGuard;
module.exports.authGuard = authGuard;
module.exports.authorize = authorize;
