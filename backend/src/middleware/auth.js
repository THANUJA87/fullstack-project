const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const { sendError } = require('../utils/response');

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return sendError(res, 401, 'Authentication required');

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    return sendError(res, 401, 'Invalid or expired token');
  }
}

module.exports = authenticate;
