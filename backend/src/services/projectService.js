const { validate: isUuid } = require('uuid');
const pool = require('../config/database');

const VALID_STATUSES = ['ACTIVE', 'INACTIVE', 'DRAFT'];

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function validateProjectId(id) {
  if (!isUuid(id)) throw badRequest('Invalid project id');
}

function projectInput(data, partial = false) {
  const input = {
    name: data.name === undefined ? undefined : String(data.name).trim(),
    address: data.address === undefined ? undefined : String(data.address).trim(),
    useCase: data.useCase === undefined ? undefined : String(data.useCase).trim(),
    status: data.status,
  };
  if (!partial && (!input.name || !input.address || !input.useCase)) {
    throw badRequest('Name, address, and useCase are required');
  }
  if (input.name === '' || input.address === '' || input.useCase === '') {
    throw badRequest('Name, address, and useCase cannot be empty');
  }
  if (input.status !== undefined && !VALID_STATUSES.includes(input.status)) {
    throw badRequest('Invalid project status');
  }
  return input;
}

async function withTenantContext(user, work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `SELECT set_config('app.current_tenant_id', $1, true),
              set_config('app.current_user_id', $2, true)`,
      [user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : String(user.tenantId || ''), String(user.id)],
    );
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listProjects(user) {
  return withTenantContext(user, async (client) => {
    const result = await client.query(
      `SELECT p.*, t.name AS tenant_name, u.name AS owner_name
       FROM projects p JOIN tenants t ON t.id = p.tenant_id
       LEFT JOIN users u ON u.id = p.owner_id
       ORDER BY p.updated_at DESC`,
    );
    return result.rows;
  });
}

async function getProject(user, id) {
  validateProjectId(id);
  return withTenantContext(user, async (client) => {
    const result = await client.query(
      `SELECT p.*, t.name AS tenant_name, u.name AS owner_name
       FROM projects p JOIN tenants t ON t.id = p.tenant_id
       LEFT JOIN users u ON u.id = p.owner_id WHERE p.id = $1`,
      [id],
    );
    if (!result.rowCount) {
      const error = new Error('Project not found');
      error.status = 404;
      throw error;
    }
    return result.rows[0];
  });
}

async function createProject(user, data) {
  const input = projectInput(data);
  if (!user.tenantId && user.role !== 'SUPER_ADMIN') throw badRequest('User is not assigned to a tenant');
  if (user.role === 'SUPER_ADMIN' && !data.tenantId) throw badRequest('Tenant is required for Super Admin project creation');
  const tenantId = user.role === 'SUPER_ADMIN' ? data.tenantId : user.tenantId;
  if (!isUuid(tenantId)) throw badRequest('Invalid tenant id');

  return withTenantContext({ ...user, tenantId: user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : tenantId }, async (client) => {
    const tenant = await client.query('SELECT id FROM tenants WHERE id = $1', [tenantId]);
    if (!tenant.rowCount) throw badRequest('Tenant not found');
    const result = await client.query(
      `INSERT INTO projects (name, address, use_case, status, tenant_id, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [input.name, input.address, input.useCase, input.status || 'DRAFT', tenantId, user.id],
    );
    return result.rows[0];
  });
}

async function updateProject(user, id, data) {
  validateProjectId(id);
  const input = projectInput(data, true);
  const fields = [];
  const values = [];
  for (const [column, value] of [['name', input.name], ['address', input.address], ['use_case', input.useCase], ['status', input.status]]) {
    if (value !== undefined) {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    }
  }
  if (!fields.length) throw badRequest('No valid fields to update');
  values.push(id);

  return withTenantContext(user, async (client) => {
    const result = await client.query(
      `UPDATE projects SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length} RETURNING *`,
      values,
    );
    if (!result.rowCount) {
      const error = new Error('Project not found');
      error.status = 404;
      throw error;
    }
    return result.rows[0];
  });
}

async function deleteProject(user, id) {
  validateProjectId(id);
  return withTenantContext(user, async (client) => {
    const result = await client.query('DELETE FROM projects WHERE id = $1', [id]);
    if (!result.rowCount) {
      const error = new Error('Project not found');
      error.status = 404;
      throw error;
    }
  });
}

module.exports = { listProjects, getProject, createProject, updateProject, deleteProject };
