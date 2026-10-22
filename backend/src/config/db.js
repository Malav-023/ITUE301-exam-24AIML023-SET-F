const mongoose = require('mongoose');
const logger = require('./logger');

// Hide credentials when logging a connection string
const maskUri = (uri = '') => uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () =>
    logger.info('MongoDB connected', { host: mongoose.connection.host, db: mongoose.connection.name })
  );
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB connection error', err));

  try {
    logger.info(`Connecting to MongoDB: ${maskUri(uri)}`);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  } catch (err) {
    logger.error(
      'Could not connect to MongoDB. Check that MongoDB is running and MONGO_URI in backend/.env is correct (for Atlas: also whitelist your IP).',
      err
    );
    process.exit(1);
  }
};

module.exports = connectDB;
