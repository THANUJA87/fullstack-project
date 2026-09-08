const express = require('express');
const authController = require('../controllers/authController');
const asyncHandler = require('../middleware/asyncHandler');
const { loginLimiter, registrationLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/login', loginLimiter, asyncHandler(authController.login));
router.post('/register', registrationLimiter, asyncHandler(authController.register));

module.exports = router;
