const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['attendee', 'organizer', 'admin'];

const attendeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name must be at most 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-\s]{7,15}$/, 'Phone must be 7-15 digits (may include +, - or spaces)'],
    },
    // Extra fields (beyond the exam spec) needed for login + role-based access
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned unless explicitly requested
    },
    role: {
      type: String,
      enum: { values: ROLES, message: 'Role must be one of: attendee, organizer, admin' },
      default: 'attendee',
    },
  },
  { timestamps: true }
);

// Hash password only when it was set/changed (runs AFTER validation)
attendeeSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

attendeeSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

const Attendee = mongoose.model('Attendee', attendeeSchema);
Attendee.ROLES = ROLES;

module.exports = Attendee;
