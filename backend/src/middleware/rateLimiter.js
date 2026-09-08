const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
});

const rateLimitResponse = (req, res) => {
  res.status(429).json({ error: 'Too many requests, please try again later.' });
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  handler: rateLimitResponse,
});

module.exports = { globalLimiter, loginLimiter };
