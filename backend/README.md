# Project Stack API

Multi-tenant project management REST API with JWT authentication, RBAC, permission-based authorization, tenant isolation, and rate limiting.

## Setup

1. Create a fresh PostgreSQL database named `fullstack`.
2. Copy `.env.example` to `.env` and set database credentials and a long random `JWT_SECRET`.
3. Run `npm install`, then `npm run dev`.

With `AUTO_SEED=true`, the API creates the UUID/RBAC/RLS schema and seed fixtures on startup. Use a fresh database for this schema because it replaces the earlier integer project model.

## API endpoints

| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/login` | Public (rate limited) |
| GET | `/api/me` | Authenticated |
| GET/POST | `/api/tenants` | `users.read`; create requires `permissions.manage` and Super Admin scope, and assigns an existing unassigned user as the tenant's Admin |
| GET/POST/GET/PATCH/PUT/DELETE | `/api/projects` | `projects.read/create/update/delete` |
| GET/POST/PUT/PATCH | `/api/users` | `users.read/create/update/disable` |
| PATCH | `/api/users/:id/tenant` | `users.update`; tenant-scoped for Admins |
| PUT | `/api/users/:id/permissions` | `permissions.manage`; Agents only |
| GET | `/api/permissions` | `users.read` |
| POST/DELETE | `/api/permissions` | `permissions.manage` |
| GET/PUT | `/api/permissions/roles/:role/permissions` | `permissions.manage`; manages SUPER_ADMIN, ADMIN, or AGENT role permissions |

## Authorization model

- **Super Admin** — Cross-tenant access; manages users, tenants, permissions, and Admin role permissions. The only role allowed to create Admin users.
- **Admin** — Single tenant; can create, update, enable, and disable Agents in that tenant and can create, update, and delete projects there. Cannot create Admins, modify Super Admins, or grant Agent permissions.
- **Agent** — Single tenant; can read projects in that tenant by default and can receive additional explicit user permissions when granted by an authorized manager.

## Security model

JWTs contain only `userId`, `role`, and `tenantId`. Every authenticated request reloads the active user and effective permissions from PostgreSQL, so disabling a user or changing permissions takes effect immediately. Users are created by authorized administrators; there is no public registration flow.

Project queries enforce tenant ownership in the service and run inside a transaction with `SET LOCAL` PostgreSQL context values. RLS policies provide defense in depth for `projects`, `users`, and `tenants`; application authorization remains mandatory. Super Admin cross-tenant context is selected by the backend from the authenticated database role, never from request input.

## Seed users

All development seed users use `password123`:

| Email | Role | Tenant |
|---|---|---|
| `super@example.com` | SUPER_ADMIN | all tenants |
| `admin.a@example.com` | ADMIN | Tenant A |
| `agent.a1@example.com` | AGENT | Tenant A; projects.read/update |
| `admin.b@example.com` | ADMIN | Tenant B |
| `agent.b1@example.com` | AGENT | Tenant B; projects.read |

## Project structure

```
backend/
  server.js              # Entry point
  db/
    schema.sql           # PostgreSQL schema
  src/
    app.js               # Express app setup
    config/              # Environment & database pool
    constants/           # Shared enums (roles, statuses)
    controllers/         # Request handlers
    middleware/          # Auth, authorization, rate limiting
    routes/              # Route definitions
    services/            # Business logic & DB queries
    seed/                # Schema, permissions, and development seed data
    utils/               # Helpers (response, tenant filter)
```

- JWT tokens (8h expiry)
- bcrypt password hashing
- Global rate limit: 100 req / minute / IP
- Login and registration rate limit: 5 req / 15 minutes / IP
- Passwords are bcrypt hashes and hashes are never returned
- Parameterized SQL and centralized error responses
