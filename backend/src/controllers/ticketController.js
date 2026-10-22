const mongoose = require('mongoose');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');

const assertObjectId = (value, name) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(400, `${name} must be a valid id`, 'INVALID_ID');
  }
};

// POST /api/v1/tickets  (protected) - book tickets
exports.createTicket = asyncHandler(async (req, res) => {
  const { eventId } = req.body || {};
  const quantity = Number(req.body?.quantity);

  assertObjectId(eventId, 'eventId');
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError(400, 'quantity must be a whole number of at least 1', 'VALIDATION_ERROR', [
      { field: 'quantity', message: 'quantity must be a whole number of at least 1' },
    ]);
  }

  // 1) Check availability first (friendly error with numbers)
  const event = await Event.findById(eventId);
  if (!event) throw new AppError(404, 'Event not found', 'EVENT_NOT_FOUND');

  if (event.date < new Date()) {
    throw new AppError(400, 'This event has already taken place', 'EVENT_PASSED');
  }

  const insufficient = () =>
    new AppError(
      400,
      event.ticketsAvailable === 0
        ? 'This event is sold out'
        : `Only ${event.ticketsAvailable} ticket(s) left, but you requested ${quantity}`,
      'INSUFFICIENT_TICKETS',
      { requested: quantity, available: event.ticketsAvailable }
    );

  if (event.ticketsAvailable < quantity) throw insufficient();

  // 2) Decrement atomically. The { $gte } condition guarantees the count can never
  //    go negative even if two people book the last tickets at the same moment.
  const updatedEvent = await Event.findOneAndUpdate(
    { _id: eventId, ticketsAvailable: { $gte: quantity } },
    { $inc: { ticketsAvailable: -quantity } },
    { new: true }
  );
  if (!updatedEvent) throw insufficient();

  // 3) Create the ticket; if that fails, give the tickets back
  try {
    const ticket = await Ticket.create({ attendeeId: req.user.id, eventId, quantity });
    logger.info('Tickets booked', {
      ticketId: ticket.id,
      eventId,
      quantity,
      remaining: updatedEvent.ticketsAvailable,
      userId: req.user.id,
      requestId: req.id,
    });
    res.status(201).json({ success: true, data: { ticket, event: updatedEvent } });
  } catch (err) {
    await Event.findByIdAndUpdate(eventId, { $inc: { ticketsAvailable: quantity } });
    logger.error('Ticket creation failed - tickets restored to event', { eventId, quantity, requestId: req.id });
    throw err;
  }
});

// GET /api/v1/tickets/my  (protected)
exports.getMyTickets = asyncHandler(async (req, res) => {
  const tickets = await Ticket.find({ attendeeId: req.user.id })
    .sort({ bookingDate: -1 })
    .populate('attendeeId', 'name email')
    .populate('eventId', 'title date venue');

  res.status(200).json({ success: true, count: tickets.length, data: tickets });
});

// PATCH /api/v1/tickets/:id/status  (protected)
//  - attendee: may cancel their OWN booked ticket
//  - organizer/admin: may mark any booked ticket as used or cancelled
//  - cancelled/used are final states; cancelling returns tickets to the event
exports.updateTicketStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  assertObjectId(id, 'ticket id');
  if (!Ticket.STATUSES.includes(status)) {
    throw new AppError(400, `status must be one of: ${Ticket.STATUSES.join(', ')}`, 'VALIDATION_ERROR', [
      { field: 'status', message: `status must be one of: ${Ticket.STATUSES.join(', ')}` },
    ]);
  }

  const ticket = await Ticket.findById(id);
  if (!ticket) throw new AppError(404, 'Ticket not found', 'TICKET_NOT_FOUND');

  const isStaff = ['organizer', 'admin'].includes(req.user.role);
  const isOwner = ticket.attendeeId.toString() === req.user.id;

  if (!isStaff && !isOwner) throw new AppError(403, 'You can only change your own tickets', 'FORBIDDEN');
  if (!isStaff && status !== 'cancelled') throw new AppError(403, 'Attendees can only cancel tickets', 'FORBIDDEN');

  if (ticket.status !== 'booked' || status === 'booked') {
    throw new AppError(409, `Ticket is already "${ticket.status}" and cannot be changed to "${status}"`, 'INVALID_TRANSITION');
  }

  // Conditional update prevents double-cancel (and double restore) on parallel requests
  const updated = await Ticket.findOneAndUpdate(
    { _id: id, status: 'booked' },
    { status },
    { new: true, runValidators: true }
  );
  if (!updated) throw new AppError(409, 'Ticket was changed by another request', 'INVALID_TRANSITION');

  if (status === 'cancelled') {
    await Event.findByIdAndUpdate(ticket.eventId, { $inc: { ticketsAvailable: ticket.quantity } });
  }

  logger.info('Ticket status updated', { ticketId: id, from: 'booked', to: status, userId: req.user.id, requestId: req.id });
  res.status(200).json({ success: true, data: updated });
});
