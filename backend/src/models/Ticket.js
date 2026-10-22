const mongoose = require('mongoose');

const STATUSES = ['booked', 'cancelled', 'used'];

const ticketSchema = new mongoose.Schema(
  {
    attendeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendee', required: [true, 'attendeeId is required'], index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: [true, 'eventId is required'], index: true },
    quantity: {
      type: Number,
      required: [true, 'quantity is required'],
      min: [1, 'quantity must be at least 1'],
      validate: { validator: Number.isInteger, message: 'quantity must be a whole number' },
    },
    bookingDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: { values: STATUSES, message: 'status must be one of: booked, cancelled, used' },
      default: 'booked',
    },
  },
  { timestamps: true }
);

const Ticket = mongoose.model('Ticket', ticketSchema);
Ticket.STATUSES = STATUSES;

module.exports = Ticket;
