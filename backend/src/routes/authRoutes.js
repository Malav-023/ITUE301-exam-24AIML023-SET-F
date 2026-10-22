const router = require('express').Router();
const { login, register } = require('../controllers/authController');

router.post('/login', login); // public
router.post('/register', register); // public

module.exports = router;
