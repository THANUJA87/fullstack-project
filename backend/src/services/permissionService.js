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
  if (!/^[a-z0-9:_-]+$/.test(key)) {
    const error = new Error('Permission key must be lowercase alphanumeric with : _ -');
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

module.exports = { listPermissions, createPermission, deletePermission };
