const { sendError } = require('../utils/response');

function handleServiceError(res, err) {
  if (err.status) return sendError(res, err.status, err.message);
  throw err;
}

module.exports = { handleServiceError };
