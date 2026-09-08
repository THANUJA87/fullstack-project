CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS roles (
  name VARCHAR(20) PRIMARY KEY CHECK (name IN ('SUPER_ADMIN', 'ADMIN', 'AGENT'))
);

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(80) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  key VARCHAR(80) PRIMARY KEY,
  label VARCHAR(160) NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role VARCHAR(20) REFERENCES roles(name) ON DELETE CASCADE,
  permission_key VARCHAR(80) REFERENCES permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_key)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL REFERENCES roles(name),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_key VARCHAR(80) REFERENCES permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (user_id, permission_key)
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  address VARCHAR(240) NOT NULL,
  use_case VARCHAR(160) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT')),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projects DROP COLUMN IF EXISTS owner_id;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON projects;
CREATE POLICY tenant_isolation ON projects USING (
  current_setting('app.current_tenant_id', true) = 'SUPER_ADMIN'
  OR tenant_id::text = current_setting('app.current_tenant_id', true)
);

DROP POLICY IF EXISTS user_tenant_isolation ON users;
CREATE POLICY user_tenant_isolation ON users USING (
  current_setting('app.current_tenant_id', true) = 'SUPER_ADMIN'
  OR tenant_id::text = current_setting('app.current_tenant_id', true)
  OR id::text = current_setting('app.current_user_id', true)
);

DROP POLICY IF EXISTS tenant_rows ON tenants;
CREATE POLICY tenant_rows ON tenants USING (
  current_setting('app.current_tenant_id', true) = 'SUPER_ADMIN'
  OR id::text = current_setting('app.current_tenant_id', true)
);
