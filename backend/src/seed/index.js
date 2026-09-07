const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function seedDatabase() {
  const schemaPath = path.join(__dirname, '../../db/schema.sql');
  await pool.query(fs.readFileSync(schemaPath, 'utf8'));

  await pool.query(`
    INSERT INTO roles (name) VALUES ('SUPER_ADMIN'), ('ADMIN'), ('AGENT')
    ON CONFLICT DO NOTHING
  `);

  const permissions = [
    ['users.read', 'Read users'],
    ['users.create', 'Create users'],
    ['users.update', 'Update users'],
    ['users.disable', 'Enable or disable users'],
    ['projects.read', 'Read projects'],
    ['projects.create', 'Create projects'],
    ['projects.update', 'Update projects'],
    ['projects.delete', 'Delete projects'],
    ['permissions.manage', 'Manage role permissions'],
  ];
  for (const permission of permissions) {
    await pool.query('INSERT INTO permissions (key, label) VALUES ($1, $2) ON CONFLICT DO NOTHING', permission);
  }
  const rolePermissions = {
    SUPER_ADMIN: permissions.map(([key]) => key),
    ADMIN: ['users.read', 'users.create', 'users.update', 'users.disable', 'projects.read', 'projects.create', 'projects.update', 'projects.delete'],
    AGENT: [],
  };
  for (const [role, keys] of Object.entries(rolePermissions)) {
    for (const key of keys) {
      await pool.query('INSERT INTO role_permissions (role, permission_key) VALUES ($1, $2) ON CONFLICT DO NOTHING', [role, key]);
    }
  }

  const tenants = [
    ['Tenant A', 'tenant-a'],
    ['Tenant B', 'tenant-b'],
  ];
  const tenantIds = {};
  for (const [name, slug] of tenants) {
    const result = await pool.query(
      `INSERT INTO tenants (name, slug) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, slug`,
      [name, slug],
    );
    tenantIds[slug] = result.rows[0].id;
  }

  const identities = [
    ['Super Admin', 'super@example.com', 'SUPER_ADMIN', null, []],
    ['Admin A', 'admin.a@example.com', 'ADMIN', tenantIds['tenant-a'], []],
    ['Agent A1', 'agent.a1@example.com', 'AGENT', tenantIds['tenant-a'], ['projects.read', 'projects.update']],
    ['Admin B', 'admin.b@example.com', 'ADMIN', tenantIds['tenant-b'], []],
    ['Agent B1', 'agent.b1@example.com', 'AGENT', tenantIds['tenant-b'], ['projects.read']],
  ];

  for (const [name, email, role, tenantId, permissions] of identities) {
    const user = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role, tenant_id = EXCLUDED.tenant_id, is_active = TRUE
       RETURNING id`,
      [name, email, await bcrypt.hash('password123', 10), role, tenantId],
    );
    await pool.query('DELETE FROM user_permissions WHERE user_id = $1', [user.rows[0].id]);
    for (const permission of permissions) {
      await pool.query(
        'INSERT INTO user_permissions (user_id, permission_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [user.rows[0].id, permission],
      );
    }
  }

  await pool.query(`
    INSERT INTO projects (tenant_id, name, address, use_case, status, owner_id)
    SELECT $1, 'Project A1', '100 Northstar Avenue', 'Customer workspace', 'ACTIVE', u.id
    FROM users u WHERE u.email = 'admin.a@example.com'
      AND NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Project A1' AND tenant_id = $1)
  `, [tenantIds['tenant-a']]);

  await pool.query(`
    INSERT INTO projects (tenant_id, name, address, use_case, status, owner_id)
    SELECT $1, 'Project A2', '200 Northstar Avenue', 'Reporting', 'DRAFT', u.id
    FROM users u WHERE u.email = 'admin.a@example.com'
      AND NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Project A2' AND tenant_id = $1)
  `, [tenantIds['tenant-a']]);

  await pool.query(`
    INSERT INTO projects (tenant_id, name, address, use_case, status, owner_id)
    SELECT $1, 'Project B1', '300 Acme Road', 'Operations', 'ACTIVE', u.id
    FROM users u WHERE u.email = 'admin.b@example.com'
      AND NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Project B1' AND tenant_id = $1)
  `, [tenantIds['tenant-b']]);
}

module.exports = seedDatabase;
