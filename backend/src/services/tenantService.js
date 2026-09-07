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

  const result = await pool.query(
    'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id, name, slug, created_at AS "createdAt"',
    [name, slug],
  );
  return result.rows[0];
}

module.exports = { listTenants, createTenant };
