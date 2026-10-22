const router = require('express').Router();
const { createTicket, getMyTickets, updateTicketStatus } = require('../controllers/ticketController');
const authGuard = require('../middleware/authGuard');

router.use(authGuard); // every ticket route is protected

router.post('/', createTicket);
router.get('/my', getMyTickets);
router.patch('/:id/status', updateTicketStatus);

module.exports = router;
