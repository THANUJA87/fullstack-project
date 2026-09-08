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

async function createTenant(actor, { name, slug, adminUserId }) {
  if (actor.role !== 'SUPER_ADMIN') {
    const error = new Error('Only a Super Admin can create tenants');
    error.status = 403;
    throw error;
  }
  if (!name || !slug) {
    const error = new Error('Tenant name and slug are required');
    error.status = 400;
    throw error;
  }

  if (!adminUserId) {
    const error = new Error('An existing user must be selected as Admin');
    error.status = 400;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `SELECT set_config('app.current_tenant_id', 'SUPER_ADMIN', true),
              set_config('app.current_user_id', $1, true)`,
      [String(actor.id)],
    );
    const tenantResult = await client.query(
      'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id, name, slug, created_at AS "createdAt"',
      [name, slug],
    );
    const tenant = tenantResult.rows[0];
    const adminResult = await client.query(
      `UPDATE users
       SET role = 'ADMIN', tenant_id = $1, updated_at = NOW()
       WHERE id = $2 AND role <> 'SUPER_ADMIN' AND tenant_id IS NULL
       RETURNING id, name, email, role, tenant_id`,
      [tenant.id, adminUserId],
    );
    if (!adminResult.rowCount) {
      const error = new Error('Selected user is unavailable or already assigned to a tenant');
      error.status = 400;
      throw error;
    }
    await client.query('COMMIT');
    return { ...tenant, admin: adminResult.rows[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      const error = new Error(err.constraint?.includes('users') ? 'Admin email already in use' : 'Tenant slug already exists');
      error.status = 409;
      throw error;
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { listTenants, createTenant };
