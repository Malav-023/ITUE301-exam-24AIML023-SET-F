const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [120, 'Title must be at most 120 characters'],
    },
    category: { type: String, trim: true, default: 'General' },
    date: { type: Date, required: [true, 'Date is required'] },
    venue: { type: String, required: [true, 'Venue is required'], trim: true },
    ticketsAvailable: {
      type: Number,
      required: [true, 'ticketsAvailable is required'],
      min: [0, 'ticketsAvailable cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'ticketsAvailable must be a whole number',
      },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendee' },
  },
  { timestamps: true }
);

eventSchema.index({ date: 1 });

module.exports = mongoose.model('Event', eventSchema);
