const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function seedDatabase() {
  const schemaPath = path.join(__dirname, '../../db/schema.sql');
  await pool.query(fs.readFileSync(schemaPath, 'utf8'));

  const tenants = [
    ['Northstar Studio', 'northstar'],
    ['Acme Labs', 'acme'],
  ];
  const tenantIds = {};

  for (const [name, slug] of tenants) {
    const result = await pool.query(
      `INSERT INTO tenants (name, slug) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id, slug`,
      [name, slug],
    );
    tenantIds[slug] = result.rows[0].id;
  }

  await pool.query(`
    INSERT INTO permissions (key, label) VALUES
      ('projects:create', 'Create projects'),
      ('projects:update', 'Update projects'),
      ('projects:delete', 'Delete projects')
    ON CONFLICT DO NOTHING
  `);

  const identities = [
    ['Avery Stone', 'super@northstar.local', 'SUPER_ADMIN', null, ['projects:create', 'projects:update', 'projects:delete']],
    ['Maya Chen', 'admin@northstar.local', 'ADMIN', tenantIds.northstar, ['projects:create', 'projects:update', 'projects:delete']],
    ['Leo Martins', 'agent@northstar.local', 'AGENT', tenantIds.northstar, ['projects:update']],
    ['Sam Rivera', 'admin@acme.local', 'ADMIN', tenantIds.acme, ['projects:create', 'projects:update', 'projects:delete']],
  ];

  for (const [name, email, role, tenantId, perms] of identities) {
    const user = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, tenant_id = EXCLUDED.tenant_id
       RETURNING id`,
      [name, email, await bcrypt.hash('password123', 10), role, tenantId],
    );
    for (const permission of perms) {
      await pool.query(
        'INSERT INTO user_permissions (user_id, permission_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [user.rows[0].id, permission],
      );
    }
  }

  await pool.query(`
    INSERT INTO projects (tenant_id, name, description, status, priority, due_date, owner_id)
    SELECT $1, 'Website redesign', 'Refresh the customer workspace and ship the new navigation.',
           'IN_PROGRESS', 'HIGH', CURRENT_DATE + 14, u.id
    FROM users u WHERE u.email = 'admin@northstar.local'
      AND NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Website redesign' AND tenant_id = $1)
  `, [tenantIds.northstar]);

  await pool.query(`
    INSERT INTO projects (tenant_id, name, description, status, priority, due_date, owner_id)
    SELECT $1, 'Enterprise launch plan', 'Coordinate the rollout across priority accounts.',
           'ON_HOLD', 'HIGH', CURRENT_DATE + 42, u.id
    FROM users u WHERE u.email = 'admin@acme.local'
      AND NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Enterprise launch plan' AND tenant_id = $1)
  `, [tenantIds.acme]);
}

module.exports = seedDatabase;
