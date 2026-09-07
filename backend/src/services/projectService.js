const pool = require('../config/database');
const { tenantFilter } = require('../utils/tenant');
const { VALID_STATUSES, VALID_PRIORITIES } = require('../constants');

async function listProjects(user) {
  const filter = tenantFilter(user, 'p.tenant_id', 1);
  const result = await pool.query(
    `SELECT p.*, t.name AS tenant_name, u.name AS owner_name
     FROM projects p
     JOIN tenants t ON t.id = p.tenant_id
     LEFT JOIN users u ON u.id = p.owner_id
     WHERE TRUE${filter.sql}
     ORDER BY p.updated_at DESC`,
    filter.values,
  );
  return result.rows;
}

async function createProject(user, data) {
  const name = String(data.name || '').trim();
  const description = String(data.description || '');
  const status = data.status || 'IN_PROGRESS';
  const priority = data.priority || 'MEDIUM';
  const dueDate = data.dueDate || null;
  const selectedTenant = user.role === 'SUPER_ADMIN' ? Number(data.tenantId) : user.tenantId;

  if (!name) {
    const error = new Error('Project name is required');
    error.status = 400;
    throw error;
  }
  if (!selectedTenant) {
    const error = new Error('Tenant is required');
    error.status = 400;
    throw error;
  }
  if (!VALID_STATUSES.includes(status)) {
    const error = new Error('Invalid status');
    error.status = 400;
    throw error;
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    const error = new Error('Invalid priority');
    error.status = 400;
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO projects (tenant_id, name, description, status, priority, due_date, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [selectedTenant, name, description, status, priority, dueDate, user.id],
  );
  return result.rows[0];
}

async function updateProject(user, id, data) {
  const { name, description, status, priority, dueDate } = data;

  if (status && !VALID_STATUSES.includes(status)) {
    const error = new Error('Invalid status');
    error.status = 400;
    throw error;
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    const error = new Error('Invalid priority');
    error.status = 400;
    throw error;
  }

  const filter = tenantFilter(user, 'p.tenant_id', 7);
  const result = await pool.query(
    `UPDATE projects p
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         priority = COALESCE($4, priority),
         due_date = COALESCE($5, due_date),
         updated_at = NOW()
     WHERE p.id = $6${filter.sql}
     RETURNING p.*`,
    [name?.trim() || null, description ?? null, status ?? null, priority ?? null, dueDate ?? null, id, ...filter.values],
  );

  if (!result.rowCount) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }
  return result.rows[0];
}

async function deleteProject(user, id) {
  const filter = tenantFilter(user, 'tenant_id', 2);
  const result = await pool.query(
    `DELETE FROM projects WHERE id = $1${filter.sql}`,
    [id, ...filter.values],
  );

  if (!result.rowCount) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }
}

module.exports = { listProjects, createProject, updateProject, deleteProject };
