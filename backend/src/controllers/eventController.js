const Event = require('../models/Event');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');

// GET /api/v1/events  (public)
exports.listEvents = asyncHandler(async (req, res) => {
  const events = await Event.find().sort({ date: 1 });
  res.status(200).json({ success: true, count: events.length, data: events });
});

// POST /api/v1/events  (organizer | admin) - used by the Organizer Panel
exports.createEvent = asyncHandler(async (req, res) => {
  const { title, category, date, venue, ticketsAvailable } = req.body || {};
  const event = await Event.create({ title, category, date, venue, ticketsAvailable, createdBy: req.user.id });

  logger.info('Event created', { eventId: event.id, by: req.user.id, requestId: req.id });
  res.status(201).json({ success: true, data: event });
});
