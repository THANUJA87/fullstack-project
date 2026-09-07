const { sendError } = require('../utils/response');

const allowRoles = (...roles) => (req, res, next) => (
  roles.includes(req.user.role)
    ? next()
    : sendError(res, 403, 'Your role cannot perform this action')
);

const requirePermission = (permission) => (req, res, next) => {
  if (
    req.user.role === 'SUPER_ADMIN'
    || req.user.role === 'ADMIN'
    || req.user.permissions?.includes(permission)
  ) {
    return next();
  }
  return sendError(res, 403, `Missing permission: ${permission}`);
};

module.exports = { allowRoles, requirePermission };
