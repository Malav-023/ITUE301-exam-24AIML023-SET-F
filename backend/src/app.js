const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

app.disable('x-powered-by');

// 1) Global request logger - first, so every request (even rejected ones) is logged
app.use(requestLogger);

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));

// 2) API routes
app.use('/api/v1', routes);

// 3) 404 + global error handler - must stay LAST
app.use(notFound);
app.use(errorHandler);

module.exports = app;
