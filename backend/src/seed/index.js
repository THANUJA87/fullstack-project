const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function migrateLegacySchema() {
  const legacyCheck = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name = 'projects' AND column_name = 'address'`,
  );
  if (legacyCheck.rowCount) return;

  const projectsTable = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'projects'`,
  );
  if (!projectsTable.rowCount) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('ALTER TABLE user_permissions RENAME TO legacy_user_permissions');
    await client.query('ALTER TABLE projects RENAME TO legacy_projects');
    await client.query('ALTER TABLE users RENAME TO legacy_users');
    await client.query('ALTER TABLE permissions RENAME TO legacy_permissions');
    await client.query('ALTER TABLE tenants RENAME TO legacy_tenants');
    await client.query(fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8'));

    await client.query(`
      CREATE TEMP TABLE tenant_map (old_id INTEGER PRIMARY KEY, new_id UUID NOT NULL)
      ON COMMIT DROP;
      INSERT INTO tenant_map SELECT id, gen_random_uuid() FROM legacy_tenants;
      INSERT INTO tenants (id, name, slug)
      SELECT tm.new_id, lt.name, lt.slug FROM legacy_tenants lt JOIN tenant_map tm ON tm.old_id = lt.id;

      INSERT INTO permissions (key, label)
      SELECT REPLACE(key, ':', '.'), label FROM legacy_permissions ON CONFLICT DO NOTHING;

      CREATE TEMP TABLE user_map (old_id INTEGER PRIMARY KEY, new_id UUID NOT NULL)
      ON COMMIT DROP;
      INSERT INTO user_map SELECT id, gen_random_uuid() FROM legacy_users;
      INSERT INTO users (id, tenant_id, name, email, password_hash, role, is_active, created_at)
      SELECT um.new_id, tm.new_id, lu.name, lu.email, lu.password_hash, lu.role, lu.is_active, lu.created_at
      FROM legacy_users lu JOIN user_map um ON um.old_id = lu.id
      LEFT JOIN tenant_map tm ON tm.old_id = lu.tenant_id;

      INSERT INTO user_permissions (user_id, permission_key)
      SELECT um.new_id, REPLACE(lup.permission_key, ':', '.')
      FROM legacy_user_permissions lup JOIN user_map um ON um.old_id = lup.user_id
      ON CONFLICT DO NOTHING;

      INSERT INTO projects (name, address, use_case, status, tenant_id, owner_id, created_at, updated_at)
      SELECT lp.name, COALESCE(NULLIF(lp.description, ''), 'Legacy project'),
             COALESCE(NULLIF(lp.description, ''), 'Legacy project'),
             CASE lp.status WHEN 'COMPLETED' THEN 'INACTIVE' WHEN 'IN_PROGRESS' THEN 'ACTIVE' ELSE 'DRAFT' END,
             tm.new_id, um.new_id, lp.created_at, lp.updated_at
      FROM legacy_projects lp JOIN tenant_map tm ON tm.old_id = lp.tenant_id
      LEFT JOIN user_map um ON um.old_id = lp.owner_id;
    `);
    await client.query('DROP TABLE legacy_user_permissions, legacy_projects, legacy_users, legacy_permissions, legacy_tenants CASCADE');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function seedDatabase() {
  const schemaPath = path.join(__dirname, '../../db/schema.sql');
  await migrateLegacySchema();
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
    AGENT: ['projects.read'],
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
    INSERT INTO projects (tenant_id, name, address, use_case, status)
    SELECT $1, 'Project A1', '100 Project Stack Avenue', 'Customer workspace', 'ACTIVE'
    WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Project A1' AND tenant_id = $1)
  `, [tenantIds['tenant-a']]);

  await pool.query(`
    INSERT INTO projects (tenant_id, name, address, use_case, status)
    SELECT $1, 'Project A2', '200 Project Stack Avenue', 'Reporting', 'DRAFT'
    WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Project A2' AND tenant_id = $1)
  `, [tenantIds['tenant-a']]);

  await pool.query(`
    INSERT INTO projects (tenant_id, name, address, use_case, status)
    SELECT $1, 'Project B1', '300 Acme Road', 'Operations', 'ACTIVE'
    WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Project B1' AND tenant_id = $1)
  `, [tenantIds['tenant-b']]);
}

module.exports = seedDatabase;
