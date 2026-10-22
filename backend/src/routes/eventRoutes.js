const router = require('express').Router();
const { listEvents, createEvent } = require('../controllers/eventController');
const { authGuard, authorize } = require('../middleware/authGuard');

router.get('/', listEvents); // public listing
router.post('/', authGuard, authorize('organizer', 'admin'), createEvent); // protected

module.exports = router;
