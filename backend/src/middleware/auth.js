const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { jwtSecret } = require('../config');
const { sendError } = require('../utils/response');

async function authenticate(req, res, next) {
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) return sendError(res, 401, 'Authentication required');
  const token = match[1];

  try {
    const claims = jwt.verify(token, jwtSecret);
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.tenant_id, u.is_active, t.name AS tenant_name
       FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1`,
      [claims.userId || claims.id],
    );
    const user = result.rows[0];
    if (!user || !user.is_active) return sendError(res, 401, 'Invalid or expired token');
    const permissions = (await pool.query(
      `SELECT permission_key FROM (
         SELECT rp.permission_key FROM role_permissions rp WHERE rp.role = $1
         UNION
         SELECT up.permission_key FROM user_permissions up WHERE up.user_id = $2
       ) effective_permissions ORDER BY permission_key`,
      [user.role, user.id],
    )).rows.map((row) => row.permission_key);
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      tenantName: user.tenant_name,
      permissions,
    };
    next();
  } catch {
    return sendError(res, 401, 'Invalid or expired token');
  }
}

module.exports = authenticate;
