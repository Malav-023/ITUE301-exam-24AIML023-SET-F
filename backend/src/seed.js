/**
 * Demo data: npm run seed   (WIPES attendees, events and tickets!)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Attendee = require('./models/Attendee');
const Event = require('./models/Event');
const Ticket = require('./models/Ticket');
const logger = require('./config/logger');

const PASSWORD = 'Password@123';
const daysFromNow = (d, hour = 18) => {
  const date = new Date();
  date.setDate(date.getDate() + d);
  date.setHours(hour, 0, 0, 0);
  return date;
};

(async () => {
  if (process.env.NODE_ENV === 'production') {
    logger.error('Refusing to seed in production');
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    logger.error('MONGO_URI is not set. Check backend/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    await Promise.all([Ticket.deleteMany({}), Event.deleteMany({}), Attendee.deleteMany({})]);

    // create() (not insertMany) so the password-hashing hook runs
    const [admin, organizer, attendee] = await Attendee.create([
      { name: 'Admin User', email: 'admin@eventhub.test', phone: '9000000001', password: PASSWORD, role: 'admin' },
      { name: 'Olivia Organizer', email: 'organizer@eventhub.test', phone: '9000000002', password: PASSWORD, role: 'organizer' },
      { name: 'Aaron Attendee', email: 'attendee@eventhub.test', phone: '9000000003', password: PASSWORD, role: 'attendee' },
    ]);

    await Event.create([
      { title: 'Indie Rock Night', category: 'Music', date: daysFromNow(7, 19), venue: 'City Arena', ticketsAvailable: 120, createdBy: organizer.id },
      { title: 'Startup Pitch Day', category: 'Business', date: daysFromNow(10, 10), venue: 'Tech Hub Auditorium', ticketsAvailable: 40, createdBy: organizer.id },
      { title: 'Street Food Festival', category: 'Food', date: daysFromNow(14, 12), venue: 'Riverside Grounds', ticketsAvailable: 300, createdBy: organizer.id },
      { title: 'Stand-up Comedy Evening', category: 'Comedy', date: daysFromNow(5, 20), venue: 'The Laugh Club', ticketsAvailable: 5, createdBy: organizer.id },
      { title: 'Classical Dance Recital', category: 'Arts', date: daysFromNow(21, 18), venue: 'Town Hall', ticketsAvailable: 0, createdBy: admin.id }, // sold out
    ]);

    logger.info('Seed complete');
    console.log('\nDemo accounts (password for all: %s)', PASSWORD);
    console.log('  admin      admin@eventhub.test');
    console.log('  organizer  organizer@eventhub.test');
    console.log('  attendee   %s\n', attendee.email);
  } catch (err) {
    logger.error('Seeding failed', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
})();
