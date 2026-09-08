const express = require('express');
const authController = require('../controllers/authController');
const asyncHandler = require('../middleware/asyncHandler');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/login', loginLimiter, asyncHandler(authController.login));

module.exports = router;
