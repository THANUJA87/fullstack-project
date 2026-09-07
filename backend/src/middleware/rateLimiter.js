const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
});

module.exports = { globalLimiter, authLimiter };
