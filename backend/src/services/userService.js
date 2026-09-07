const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { VALID_ROLES } = require('../constants');
const { tenantFilter } = require('../utils/tenant');
const { sanitizeEmail, publicUser } = require('../utils/formatters');
const { loadUserPermissions } = require('./authService');

async function findUserById(id, tenantUser) {
  const filter = tenantFilter(tenantUser, 'u.tenant_id', 2);
  const result = await pool.query(
    `SELECT u.*, t.name AS tenant_name
     FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id
     WHERE u.id = $1${filter.sql}`,
    [id, ...filter.values],
  );
  return result.rows[0] || null;
}

async function getTenantName(tenantId) {
  if (!tenantId) return null;
  const result = await pool.query('SELECT name FROM tenants WHERE id = $1', [tenantId]);
  return result.rows[0]?.name || null;
}

async function listUsers(user) {
  const filter = tenantFilter(user, 'u.tenant_id', 1);
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.is_active, u.tenant_id, u.created_at, t.name AS tenant_name
     FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id
     WHERE TRUE${filter.sql}
     ORDER BY u.created_at DESC`,
    filter.values,
  );

  return Promise.all(result.rows.map(async (row) => ({
    ...publicUser(row),
    permissions: row.role === 'AGENT' ? await loadUserPermissions(row.id) : [],
  })));
}

async function createUser(actor, data) {
  const name = String(data.name || '').trim();
  const email = sanitizeEmail(data.email);
  const password = String(data.password || '');
  const role = actor.role === 'ADMIN' ? 'AGENT' : data.role;
  const tenantId = actor.role === 'SUPER_ADMIN' ? data.tenantId : actor.tenantId;
  const permissions = Array.isArray(data.permissions) ? data.permissions : [];

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
  if (!VALID_ROLES.includes(role)) {
    const error = new Error('Invalid role');
    error.status = 400;
    throw error;
  }
  if (actor.role === 'SUPER_ADMIN' && !['ADMIN', 'AGENT'].includes(role)) {
    const error = new Error('Super Admin can only create Admin or Agent users');
    error.status = 403;
    throw error;
  }
  if (actor.role === 'ADMIN' && role !== 'AGENT') {
    const error = new Error('Admin can only create Agent users');
    error.status = 403;
    throw error;
  }
  if (!tenantId) {
    const error = new Error('Tenant is required');
    error.status = 400;
    throw error;
  }

  const validKeys = (await pool.query('SELECT key FROM permissions')).rows.map((row) => row.key);
  const invalidPermissions = permissions.filter((permission) => !validKeys.includes(permission));
  if (invalidPermissions.length) {
    const error = new Error(`Unknown permissions: ${invalidPermissions.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const tenantCheck = await pool.query('SELECT id FROM tenants WHERE id = $1', [tenantId]);
  if (!tenantCheck.rowCount) {
    const error = new Error('Tenant not found');
    error.status = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let createdUser;

  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, is_active, tenant_id, created_at`,
      [name, email, passwordHash, role, tenantId],
    );
    createdUser = result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error('Email already in use');
      error.status = 409;
      throw error;
    }
    throw err;
  }

  if (role === 'AGENT' && permissions.length) {
    for (const permission of permissions) {
      await pool.query(
        'INSERT INTO user_permissions (user_id, permission_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [createdUser.id, permission],
      );
    }
  }

  const tenantName = await getTenantName(tenantId);
  const assignedPermissions = role === 'AGENT' ? permissions : [];
  return {
    ...publicUser({ ...createdUser, tenant_name: tenantName }),
    permissions: assignedPermissions,
  };
}

async function updateUser(actor, id, data) {
  const target = await findUserById(id, actor);
  if (!target) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (actor.role === 'ADMIN' && target.role !== 'AGENT') {
    const error = new Error('Admin can only update Agent users');
    error.status = 403;
    throw error;
  }
  if (actor.role === 'SUPER_ADMIN' && target.role === 'SUPER_ADMIN' && target.id !== actor.id) {
    const error = new Error('Cannot modify another Super Admin');
    error.status = 403;
    throw error;
  }

  const name = data.name !== undefined ? String(data.name).trim() : undefined;
  const password = data.password ? String(data.password) : null;

  if (name !== undefined && !name) {
    const error = new Error('Name cannot be empty');
    error.status = 400;
    throw error;
  }
  if (password && password.length < 8) {
    const error = new Error('Password must be at least 8 characters');
    error.status = 400;
    throw error;
  }

  const values = [];
  const sets = [];
  if (name !== undefined) {
    values.push(name);
    sets.push(`name = $${values.length}`);
  }
  if (password) {
    values.push(await bcrypt.hash(password, 10));
    sets.push(`password_hash = $${values.length}`);
  }
  if (!sets.length) {
    const error = new Error('No valid fields to update');
    error.status = 400;
    throw error;
  }

  values.push(id);
  const result = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length}
     RETURNING id, name, email, role, is_active, tenant_id, created_at`,
    values,
  );

  const tenantName = await getTenantName(result.rows[0].tenant_id);
  return publicUser({ ...result.rows[0], tenant_name: tenantName });
}

async function updateUserStatus(actor, id, isActive) {
  if (typeof isActive !== 'boolean') {
    const error = new Error('isActive must be a boolean');
    error.status = 400;
    throw error;
  }

  const target = await findUserById(id, actor);
  if (!target) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (actor.role === 'ADMIN' && target.role !== 'AGENT') {
    const error = new Error('Admin can only enable or disable Agent users');
    error.status = 403;
    throw error;
  }
  if (actor.role === 'SUPER_ADMIN' && target.role === 'SUPER_ADMIN') {
    const error = new Error('Cannot disable a Super Admin');
    error.status = 403;
    throw error;
  }

  const result = await pool.query(
    'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, email, role, is_active, tenant_id, created_at',
    [isActive, id],
  );

  const tenantName = await getTenantName(result.rows[0].tenant_id);
  return publicUser({ ...result.rows[0], tenant_name: tenantName });
}

async function setUserPermissions(actor, id, permissions) {
  if (!Array.isArray(permissions)) {
    const error = new Error('permissions array is required');
    error.status = 400;
    throw error;
  }

  const target = await findUserById(id, actor);
  if (!target) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  if (target.role !== 'AGENT') {
    const error = new Error('Permissions can only be assigned to Agent users');
    error.status = 403;
    throw error;
  }

  const validKeys = (await pool.query('SELECT key FROM permissions')).rows.map((row) => row.key);
  const invalid = permissions.filter((key) => !validKeys.includes(key));
  if (invalid.length) {
    const error = new Error(`Unknown permissions: ${invalid.join(', ')}`);
    error.status = 400;
    throw error;
  }

  await pool.query('DELETE FROM user_permissions WHERE user_id = $1', [target.id]);
  for (const permission of permissions) {
    await pool.query(
      'INSERT INTO user_permissions (user_id, permission_key) VALUES ($1, $2)',
      [target.id, permission],
    );
  }

  return { id: target.id, permissions };
}

async function assignTenant(actor, id, tenantId) {
  if (typeof tenantId !== 'string' || !tenantId) {
    const error = new Error('tenantId is required');
    error.status = 400;
    throw error;
  }
  const target = await findUserById(id, actor);
  if (!target) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  if (actor.role === 'ADMIN' && target.role !== 'AGENT') {
    const error = new Error('Admin can only assign Agents');
    error.status = 403;
    throw error;
  }
  if (actor.role === 'ADMIN' && tenantId !== actor.tenantId) {
    const error = new Error('Cannot assign a user outside your tenant');
    error.status = 403;
    throw error;
  }
  const tenant = await pool.query('SELECT id FROM tenants WHERE id = $1', [tenantId]);
  if (!tenant.rowCount) {
    const error = new Error('Tenant not found');
    error.status = 404;
    throw error;
  }
  const result = await pool.query(
    `UPDATE users SET tenant_id = $1, updated_at = NOW()
     WHERE id = $2 RETURNING id, name, email, role, is_active, tenant_id, created_at`,
    [tenantId, id],
  );
  const tenantName = await getTenantName(tenantId);
  return publicUser({ ...result.rows[0], tenant_name: tenantName });
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  updateUserStatus,
  setUserPermissions,
  assignTenant,
};
