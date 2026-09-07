const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { jwtSecret } = require('../config');
const { sanitizeEmail } = require('../utils/formatters');

async function loadUserPermissions(userId) {
  const result = await pool.query(
    `SELECT permission_key FROM (
       SELECT rp.permission_key FROM role_permissions rp JOIN users u ON u.role = rp.role WHERE u.id = $1
       UNION
       SELECT permission_key FROM user_permissions WHERE user_id = $1
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

async function register(data) {
  const name = String(data.name || '').trim();
  const email = sanitizeEmail(data.email);
  const password = String(data.password || '');

  if (!name || !email || !password) {
    const error = new Error('Name, email, and password are required');
    error.status = 400;
    throw error;
  }
  if (password.length < 8) {
    const error = new Error('Password must be at least 8 characters');
    error.status = 400;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, tenant_id)
       VALUES ($1, $2, $3, 'AGENT', NULL)
       RETURNING id, name, email, role, tenant_id`,
      [name, email, await bcrypt.hash(password, 10)],
    );
    await client.query('COMMIT');
    return createSession({ ...userResult.rows[0], tenant_name: null });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505' && err.constraint?.includes('users_email')) {
      const error = new Error('Email already in use');
      error.status = 409;
      throw error;
    }
    throw err;
  } finally {
    client.release();
  }
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

module.exports = { login, register, getProfile, loadUserPermissions };
