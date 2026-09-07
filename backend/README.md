# Northstar API

Multi-tenant project management REST API with JWT authentication, RBAC, permission-based authorization, tenant isolation, and rate limiting.

## Setup

1. Create a PostgreSQL database named `northstar`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`.
3. Run `npm install`, then `npm run dev`.

With `AUTO_SEED=true`, the API creates the schema and permission catalog on startup. It does not create users or sample projects.

## API endpoints

| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/login` | Public (rate limited) |
| POST | `/api/auth/register` | Public (rate limited); creates an AGENT account in a new tenant |
| GET | `/api/me` | Authenticated |
| GET/POST | `/api/tenants` | Super Admin |
| GET/POST/PATCH/DELETE | `/api/projects` | Role + permissions |
| GET/POST/PATCH | `/api/users` | Super Admin / Admin |
| PATCH | `/api/users/:id/status` | Super Admin / Admin |
| PUT | `/api/users/:id/permissions` | Super Admin / Admin |
| GET/POST/DELETE | `/api/permissions` | Super Admin |

## Authorization model

- **Super Admin** — Cross-tenant access; creates Admins; manages permission catalog.
- **Admin** — Single tenant; full project CRUD; creates/disables Agents; assigns Agent permissions.
- **Agent** — Single tenant; view projects; create/update/delete only with explicit permissions.

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
- Global rate limit: 200 req / 15 min
- Auth rate limit: 20 req / 15 min
- Tenant-scoped SQL queries for all data access
