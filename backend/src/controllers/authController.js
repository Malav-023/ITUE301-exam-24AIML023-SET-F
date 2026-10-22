const jwt = require('jsonwebtoken');
const Attendee = require('../models/Attendee');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');

const signToken = (attendee) =>
  jwt.sign({ sub: attendee.id, role: attendee.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

const toPublic = (a) => ({ id: a.id, name: a.name, email: a.email, phone: a.phone, role: a.role });

// POST /api/v1/auth/register  (extra endpoint so new attendees can sign up)
exports.register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body || {};
  // Role is NEVER taken from the request - public sign-ups are always attendees
  const attendee = await Attendee.create({ name, email, phone, password });

  logger.info('Attendee registered', { attendeeId: attendee.id, requestId: req.id });
  res.status(201).json({ success: true, data: { token: signToken(attendee), attendee: toPublic(attendee) } });
});

// POST /api/v1/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  // typeof checks also block NoSQL-injection payloads like { "email": { "$gt": "" } }
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw new AppError(400, 'Email and password are required', 'VALIDATION_ERROR', [
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password is required' },
    ]);
  }

  const attendee = await Attendee.findOne({ email: email.toLowerCase().trim() }).select('+password');
  const valid = attendee ? await attendee.comparePassword(password) : false;

  if (!valid) {
    logger.warn('Failed login attempt', { requestId: req.id, ip: req.ip });
    // Same message for unknown email and wrong password (don't reveal which)
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  logger.info('Login successful', { attendeeId: attendee.id, role: attendee.role, requestId: req.id });
  res.status(200).json({ success: true, data: { token: signToken(attendee), attendee: toPublic(attendee) } });
});
