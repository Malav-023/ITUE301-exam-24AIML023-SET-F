require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const logger = require('./src/config/logger');
const mongoose = require('mongoose');

const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const PORT = process.env.PORT || 5000;

const checkEnv = () => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
    process.exit(1);
  }
};

const start = async () => {
  checkEnv();
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(`EventHub API listening on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
  });

  server.on('error', (err) => {
    logger.error(err.code === 'EADDRINUSE' ? `Port ${PORT} is already in use` : 'HTTP server error', err);
    process.exit(1);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received - shutting down gracefully`);
    server.close(async () => {
      await mongoose.connection.close();
      logger.info('Shutdown complete');
      process.exit(0);
    });
    // Force exit if connections refuse to close
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception - exiting', err);
  process.exit(1);
});

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
