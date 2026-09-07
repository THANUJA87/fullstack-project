const { sendError } = require('../utils/response');

function errorHandler(err, req, res, next) {
  console.error(err);
  sendError(res, 500, 'Unexpected server error');
}

module.exports = errorHandler;
