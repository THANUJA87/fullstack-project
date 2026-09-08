const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { jwtSecret } = require('../config');
const { sanitizeEmail } = require('../utils/formatters');

async function loadUserPermissions(userId) {
  const result = await pool.query(
    `SELECT permission_key FROM (
      SELECT rp.permission_key FROM role_permissions rp JOIN users u ON u.role = rp.role
      WHERE u.id = $1 AND (u.role <> 'AGENT' OR rp.permission_key LIKE 'projects.%')
       UNION
      SELECT up.permission_key FROM user_permissions up JOIN users u ON u.id = up.user_id
      WHERE up.user_id = $1 AND (u.role <> 'AGENT' OR up.permission_key LIKE 'projects.%')
     ) effective_permissions ORDER BY permission_key`,
    [userId],
  );
  return result.rows.map((row) => row.permission_key);
}

async function login(email, password) {
  const normalizedEmail = sanitizeEmail(email);
  if (!normalizedEmail || !password) {
    const error = new Error('Email and password are required');
    error.status = 400;
    throw error;
  }

  const result = await pool.query(
    `SELECT u.*, t.name AS tenant_name
     FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id
     WHERE u.email = $1`,
    [normalizedEmail],
  );
  const user = result.rows[0];

  if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  return createSession(user);
}

async function createSession(user) {
  const permissions = await loadUserPermissions(user.id);
  const token = jwt.sign(
    { userId: user.id, role: user.role, tenantId: user.tenant_id },
    jwtSecret,
    { expiresIn: '8h' },
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      tenantName: user.tenant_name,
      permissions,
    },
  };
}

async function getProfile(userId) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.tenant_id AS "tenantId", t.name AS "tenantName"
     FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id WHERE u.id = $1`,
    [userId],
  );
  const permissions = await loadUserPermissions(userId);
  return { ...result.rows[0], permissions };
}

module.exports = { login, getProfile, loadUserPermissions };
