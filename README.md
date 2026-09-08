# Project Stack — Multi-Tenant Project Management

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

The API runs at `http://localhost:4000`. With `AUTO_SEED=true`, the UUID/RBAC/RLS schema and assignment seed fixtures are created automatically. Use a fresh PostgreSQL database for the new schema.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Account creation

The sign-in screen supports creating an account. Public registration always creates an unassigned `AGENT`; role, tenant, and permission changes remain protected administrative operations.

## Features

- JWT authentication with bcrypt password hashing
- Three-tier RBAC: Super Admin → Admin → Agent
- Permission-based authorization for users, projects, and permission management
- Application-level tenant isolation plus PostgreSQL RLS defense in depth
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
    seed/                # Schema, permissions, and development seed data
    utils/               # Helpers
frontend/
  src/
    App.jsx              # Main UI
    api.js               # API client
```
