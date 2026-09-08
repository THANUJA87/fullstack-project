const pool = require('../config/database');
const { tenantFilter } = require('../utils/tenant');

async function listTenants(user) {
  const filter = tenantFilter(user, 'id', 1);
  const result = await pool.query(
    `SELECT id, name, slug, created_at AS "createdAt" FROM tenants WHERE TRUE${filter.sql} ORDER BY name`,
    filter.values,
  );
  return result.rows;
}

async function createTenant({ name, slug }) {
  if (!name || !slug) {
    const error = new Error('Tenant name and slug are required');
    error.status = 400;
    throw error;
  }

  try {
    const result = await pool.query(
      'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id, name, slug, created_at AS "createdAt"',
      [name, slug],
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error('Tenant slug already exists');
      error.status = 409;
      throw error;
    }
    throw err;
  }
}

module.exports = { listTenants, createTenant };
