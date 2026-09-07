const pool = require('../config/database');

async function listPermissions() {
  const result = await pool.query('SELECT key, label FROM permissions ORDER BY key');
  return result.rows;
}

async function createPermission({ key, label }) {
  if (!key || !label) {
    const error = new Error('Permission key and label are required');
    error.status = 400;
    throw error;
  }
  if (!/^[a-z0-9._:-]+$/.test(key)) {
    const error = new Error('Permission key must be lowercase alphanumeric with . : _ -');
    error.status = 400;
    throw error;
  }

  try {
    const result = await pool.query(
      'INSERT INTO permissions (key, label) VALUES ($1, $2) RETURNING key, label',
      [key, label],
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error('Permission key already exists');
      error.status = 409;
      throw error;
    }
    throw err;
  }
}

async function deletePermission(key) {
  const result = await pool.query('DELETE FROM permissions WHERE key = $1', [key]);
  if (!result.rowCount) {
    const error = new Error('Permission not found');
    error.status = 404;
    throw error;
  }
}

async function getRolePermissions(role) {
  if (!['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(role)) {
    const error = new Error('Invalid role');
    error.status = 400;
    throw error;
  }
  const result = await pool.query(
    `SELECT p.key, p.label, (rp.permission_key IS NOT NULL) AS enabled
     FROM permissions p LEFT JOIN role_permissions rp
       ON rp.permission_key = p.key AND rp.role = $1 ORDER BY p.key`,
    [role],
  );
  return result.rows;
}

async function updateRolePermissions(role, permissionKeys) {
  if (role !== 'ADMIN') {
    const error = new Error('Only ADMIN role permissions can be managed');
    error.status = 403;
    throw error;
  }
  if (!Array.isArray(permissionKeys)) {
    const error = new Error('permissions must be an array');
    error.status = 400;
    throw error;
  }
  const valid = (await pool.query('SELECT key FROM permissions')).rows.map((row) => row.key);
  const invalid = permissionKeys.filter((key) => !valid.includes(key));
  if (invalid.length) {
    const error = new Error(`Unknown permissions: ${invalid.join(', ')}`);
    error.status = 400;
    throw error;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM role_permissions WHERE role = $1', [role]);
    for (const key of permissionKeys) {
      await client.query('INSERT INTO role_permissions (role, permission_key) VALUES ($1, $2)', [role, key]);
    }
    await client.query('COMMIT');
    return getRolePermissions(role);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { listPermissions, createPermission, deletePermission, getRolePermissions, updateRolePermissions };
