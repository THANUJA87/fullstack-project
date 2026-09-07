# Northstar — Multi-Tenant Project Management

A full-stack project management application with authentication, role-based access control (RBAC), permission-based authorization, and tenant isolation.

## Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (raw SQL via `pg`)

## Quick start

### 1. Database

Create a PostgreSQL database:

```sql
CREATE DATABASE northstar;
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # edit DATABASE_URL and JWT_SECRET
npm install
npm run dev
```

The API runs at `http://localhost:4000`. With `AUTO_SEED=true`, demo users and sample projects are created automatically.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Demo accounts

All passwords: `password123`

| Account | Role | Capabilities |
|---|---|---|
| `super@northstar.local` | Super Admin | All tenants, manage Admins, manage permissions |
| `admin@northstar.local` | Admin | Northstar Studio — full project CRUD, manage Agents |
| `agent@northstar.local` | Agent | View projects, update only (no create/delete) |
| `admin@acme.local` | Admin | Acme Labs — separate tenant for isolation demo |

## Features

- JWT authentication with bcrypt password hashing
- Three-tier RBAC: Super Admin → Admin → Agent
- Granular permissions for Agents (`projects:create`, `projects:update`, `projects:delete`)
- Tenant isolation enforced at the database query level
- Project CRUD with validation
- User management (create Admins/Agents, enable/disable, assign permissions)
- Permission catalog management (Super Admin)
- API rate limiting (global + auth endpoints)
- React frontend with role-aware UI

## Project structure

```
backend/
  server.js              # Entry point
  db/schema.sql          # PostgreSQL schema
  src/
    app.js               # Express setup
    config/              # Environment & DB pool
    controllers/         # Request handlers
    middleware/          # Auth, RBAC, rate limiting
    routes/              # API routes
    services/            # Business logic
    seed/                # Demo data
    utils/               # Helpers
frontend/
  src/
    App.jsx              # Main UI
    api.js               # API client
```
