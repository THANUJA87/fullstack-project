const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
});

module.exports = { globalLimiter, authLimiter };
