const router = require('express').Router();
const mongoose = require('mongoose');

router.get('/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.status(200).json({
    success: true,
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    db: states[mongoose.connection.readyState] || 'unknown',
  });
});

router.use('/auth', require('./authRoutes'));
router.use('/events', require('./eventRoutes'));
router.use('/tickets', require('./ticketRoutes'));

module.exports = router;
