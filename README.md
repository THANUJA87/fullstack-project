# Multi-Tenant Project Management

A full-stack application for managing tenants, users, and projects with authentication, role-based access control (RBAC), permission-based authorization, and tenant isolation.

## Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (raw SQL via `pg`)

## Quick start

Three user roles exist in a hierarchy:

```
SUPER_ADMIN  →  ADMIN  →  AGENT
```

| Role | Scope |
|---|---|
| **Super Admin** | Entire system — all tenants |
| **Admin** | One tenant |
| **Agent** | One tenant, limited actions |

Access is controlled by:
1. **Role** — position in the hierarchy
2. **Permissions** — specific actions like `projects.create` or `users.read`

---

## Prerequisites

Install these before starting:

- **Node.js** (v18 or later)
- **PostgreSQL** (v14 or later)
- **npm**

---

## Setup from scratch

### Step 1 — Clone / open the project

```bash
cd fullstack-project
```

### Step 2 — Create the database

Open PostgreSQL and run:

```sql
CREATE DATABASE fullstack;
```

### Step 3 — Configure backend environment

Copy the example env file:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=4000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=fullstack
DB_SSL=false

JWT_SECRET=your-long-random-secret
FRONTEND_URL=http://localhost:5173
AUTO_SEED=true
```

| Variable | Purpose |
|---|---|
| `DB_*` | PostgreSQL connection |
| `JWT_SECRET` | Signs authentication tokens |
| `FRONTEND_URL` | Allowed CORS origin |
| `AUTO_SEED=true` | Creates tables and demo data on startup |

### Step 4 — Install and start the backend

```bash
cd backend
npm install
npm run dev
```

The API runs at **http://localhost:4000**.

On first start with `AUTO_SEED=true`, the backend will:
- Create database tables
- Seed roles and permissions
- Create demo tenants, users, and projects

### Step 5 — Install and start the frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:5173**.

### Step 6 — Log in

Open **http://localhost:5173** and sign in with a demo account (see below).  
All demo passwords are: **`password123`**

---

## Demo accounts

| Email | Role | Tenant | Notes |
|---|---|---|---|
| `super@example.com` | Super Admin | All tenants | Full system access |
| `admin.a@example.com` | Admin | Tenant A | Manages Tenant A |
| `agent.a1@example.com` | Agent | Tenant A | Can read + update projects |
| `admin.b@example.com` | Admin | Tenant B | Manages Tenant B |
| `agent.b1@example.com` | Agent | Tenant B | Can read projects only |

---

## Application flow

### 1. Login

```
User enters email + password
        ↓
POST /api/auth/login
        ↓
Backend validates credentials
        ↓
Returns JWT token + user profile (role, tenant, permissions)
        ↓
Frontend stores token → shows dashboard
        ↓
Every API request sends: Authorization: Bearer <token>
```

After login, the sidebar only shows pages the user is allowed to access.

On every request the backend:
- Verifies the JWT
- Reloads the user from the database
- Recalculates permissions from role + user grants
- Rejects disabled users immediately

---

### 2. Super Admin

The Super Admin is a system-level user not tied to one tenant.

**Can do:**
- View all tenants, users, and projects
- Create tenants and assign an Admin to each
- Create Admin users (without a tenant first)
- Manage the permission catalog
- Set default permissions per role
- Grant extra project permissions to Agents

**Cannot do:**
- Create another Super Admin
- Disable another Super Admin

**Typical workflow:**
1. Sign in as `super@example.com`
2. **People** → create an Admin user (no tenant yet)
3. **Tenants** → create a tenant and assign that user as Admin
4. **Permissions** → manage permission keys and role defaults
5. **Projects** → view/manage projects across all tenants

---

### 3. Tenant creation

Only Super Admin can create tenants.

```
Super Admin opens Tenants
        ↓
Enters tenant name + slug
        ↓
Selects an existing unassigned user
        ↓
Backend creates tenant + promotes user to Admin
```

**Important:** The Admin user must already exist before tenant creation. Create the Admin first in **People**, then assign them when creating the tenant.

---

### 4. Admin

An Admin belongs to exactly one tenant.

**Can do:**
- View users and projects in their tenant
- Create, update, and disable Agents
- Full project CRUD in their tenant

**Cannot do:**
- Access another tenant's data
- Create another Admin
- Assign permissions to Agents
- Manage the permission catalog

**Typical workflow:**
1. Sign in as `admin.a@example.com`
2. **People** → create Agents for the workspace
3. **Projects** → create and manage projects
4. Disable Agents who should no longer have access

---

### 5. Agent

An Agent belongs to one tenant with the most restricted access.

**By default:** can view projects (`projects.read`)

**Extra permissions** (granted by Super Admin only):

| Permission | Action |
|---|---|
| `projects.create` | Create projects |
| `projects.update` | Edit projects |
| `projects.delete` | Delete projects |

**Cannot do:** manage users, access other tenants, change roles or permissions.

---

### 6. Projects

Each project belongs to one tenant and has:
- Name
- Address
- Use case
- Status (`ACTIVE`, `INACTIVE`, `DRAFT`)

| Action | Required permission |
|---|---|
| View | `projects.read` |
| Create | `projects.create` |
| Update | `projects.update` |
| Delete | `projects.delete` |

| Role | Project access |
|---|---|
| Super Admin | All tenants — picks tenant when creating |
| Admin | Full CRUD within own tenant |
| Agent | Read by default; create/update/delete only if granted |

Tenant isolation is enforced in backend queries. PostgreSQL Row Level Security (RLS) adds a second protection layer.

---

### 7. Users (People page)

| Action | Super Admin | Admin |
|---|---|---|
| View users | All tenants | Own tenant |
| Create Admin | Yes | No |
| Create Agent | Yes | Yes |
| Update user | Yes | Agents only |
| Enable / disable | Admins & Agents | Agents only |
| Assign Agent permissions | Yes | No |

**Full user setup flow:**

```
Super Admin creates Admin user (no tenant)
        ↓
Super Admin creates Tenant → assigns Admin
        ↓
Admin creates Agents for the tenant
        ↓
Super Admin grants extra permissions to Agents (if needed)
        ↓
Admin manages projects; Agents work within their permissions
```

---

### 8. Permissions

Permissions define what actions a user can perform.

**Groups:**

| Group | Keys |
|---|---|
| Users | `users.read`, `users.create`, `users.update`, `users.disable` |
| Projects | `projects.read`, `projects.create`, `projects.update`, `projects.delete` |
| System | `permissions.manage` |

**Two levels:**

1. **Role permissions** — defaults for Super Admin, Admin, Agent (set on **Permissions** page)
2. **User permissions** — extra grants for individual Agents (set from **People** page)

Admins get permissions from the Admin role. Agents get base permissions from the Agent role plus any extra project permissions assigned directly.

---

### 9. Complete system flow

```
┌──────────┐
│  Login   │
└────┬─────┘
     │
     ▼
┌────────────────────────────────────┐
│     Role + Permission check        │
└────┬──────────┬──────────┬─────────┘
     │          │          │
     ▼          ▼          ▼
Super Admin   Admin      Agent
     │          │          │
     ├─Tenants  ├─People   └─Projects (read)
     ├─People   ├─Projects     + optional create/update/delete
     ├─Permissions
     ├─Projects
     └─Overview
```

**Setting up a new organization from scratch:**
1. Super Admin logs in
2. Creates an Admin user in **People**
3. Creates a tenant in **Tenants** and assigns that Admin
4. Admin logs in → creates Agents in **People**
5. Admin creates projects in **Projects**
6. Super Admin grants extra permissions to Agents if needed

---

## Project structure

```
fullstack-project/
├── README.md
├── backend/
│   ├── server.js              # Entry point
│   ├── .env.example
│   ├── db/
│   │   └── schema.sql         # Tables + RLS policies
│   └── src/
│       ├── app.js             # Express setup
│       ├── config/            # Environment & DB pool
│       ├── constants/         # Roles, statuses
│       ├── controllers/       # HTTP request handlers
│       ├── middleware/        # Auth, authorization, rate limiting
│       ├── routes/            # API route definitions
│       ├── services/          # Business logic & SQL
│       ├── seed/              # Demo data
│       └── utils/             # Helpers
└── frontend/
    └── src/
        ├── api/               # API clients
        ├── components/        # Shared UI
        ├── context/           # Auth & tenant state
        ├── features/          # Pages (auth, dashboard, projects, people, tenants, permissions)
        ├── routes/            # App routing
        ├── utils/             # Permission helpers
        └── validation/        # Form validation
```

**Backend request path:**

```
Route → Middleware (auth / authorize) → Controller → Service → PostgreSQL
```

---

## Assumptions

- This is a development/demo application, not production-hardened.
- PostgreSQL must be running and the database must exist before starting the backend.
- `AUTO_SEED=true` is for local development only.
- There is no public sign-up — users are created by administrators.
- Super Admin is the only role that can create Admins and manage permissions.
- Admin can only manage Agents within their own tenant.
- Tenant data is fully isolated — Admins and Agents never see another tenant's records.
- Backend authorization is the source of truth; frontend hides disallowed actions for UX.
- Permission and disable changes take effect on the next request.
- JWT expires after 8 hours; there is no refresh token flow.
- API rate limiting: 100 requests/minute globally, 5 login attempts per 15 minutes.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `password authentication failed` | Check `DB_USER` and `DB_PASSWORD` in `.env` |
| `database "fullstack" does not exist` | Run `CREATE DATABASE fullstack;` in PostgreSQL |
| Frontend can't reach API | Ensure backend is running on port 4000 |
| Empty dashboard after login | Check browser console; verify `AUTO_SEED=true` ran successfully |
| `Too many requests` on login | Wait 15 minutes or restart the backend (rate limit resets) |
