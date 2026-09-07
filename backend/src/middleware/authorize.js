const { sendError } = require('../utils/response');

const allowRoles = (...roles) => (req, res, next) => (
  roles.includes(req.user.role)
    ? next()
    : sendError(res, 403, 'Your role cannot perform this action')
);

const authorize = (permission) => (req, res, next) => {
  if (req.user.permissions?.includes(permission)) {
    return next();
  }
  return sendError(res, 403, `Missing permission: ${permission}`);
};

const requirePermission = authorize;

module.exports = { allowRoles, authorize, requirePermission };
