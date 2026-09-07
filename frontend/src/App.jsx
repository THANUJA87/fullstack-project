import { useCallback, useEffect, useState } from 'react';
import { api, hasPermission } from './api';
import './App.css';

const STATUS_LABELS = {
  IN_PROGRESS: 'In progress',
  PLANNING: 'Planning',
  COMPLETED: 'Completed',
  ON_HOLD: 'On hold',
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('Overview');
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [error, setError] = useState('');

  const refreshProjects = useCallback(async () => {
    const data = await api.getProjects();
    setProjects(data);
  }, []);

  const refreshUsers = useCallback(async () => {
    if (!user || user.role === 'AGENT') return;
    const data = await api.getUsers();
    setUsers(data);
  }, [user]);

  const refreshPermissions = useCallback(async () => {
    if (!user || user.role === 'AGENT') return;
    const data = await api.getPermissions();
    setPermissions(data);
  }, [user]);

  const refreshTenants = useCallback(async () => {
    if (!user || user.role === 'AGENT') return;
    const data = await api.getTenants();
    setTenants(data);
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('northstar_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then((profile) => {
        setUser(profile);
        return Promise.all([
          api.getProjects().then(setProjects),
          profile.role !== 'AGENT' ? api.getTenants().then(setTenants) : null,
          profile.role !== 'AGENT' ? api.getPermissions().then(setPermissions) : null,
          profile.role !== 'AGENT' ? api.getUsers().then(setUsers) : null,
        ]);
      })
      .catch(() => localStorage.removeItem('northstar_token'))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogin(email, password) {
    const data = await api.login(email, password);
    localStorage.setItem('northstar_token', data.token);
    setUser(data.user);
    setError('');
    const [projectList, tenantList, permissionList, userList] = await Promise.all([
      api.getProjects(),
      data.user.role !== 'AGENT' ? api.getTenants() : [],
      data.user.role !== 'AGENT' ? api.getPermissions() : [],
      data.user.role !== 'AGENT' ? api.getUsers() : [],
    ]);
    setProjects(projectList);
    setTenants(tenantList);
    setPermissions(permissionList);
    setUsers(userList);
  }

  function handleLogout() {
    localStorage.removeItem('northstar_token');
    setUser(null);
    setProjects([]);
    setUsers([]);
    setTenants([]);
    setPermissions([]);
    setActiveView('Overview');
  }

  if (loading) {
    return <div className="loading-screen">Loading workspace…</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} error={error} setError={setError} />;
  }

  const navItems = [
    'Overview',
    'Projects',
    ...(user.role !== 'AGENT' ? ['People'] : []),
    ...(user.role === 'SUPER_ADMIN' ? ['Permissions'] : []),
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span>northstar</span>
        </div>
        <div className="workspace-switcher">
          <span className="workspace-dot" />
          <span>
            <small>Workspace</small>
            {user.role === 'SUPER_ADMIN' ? 'All workspaces' : user.tenantName}
          </span>
          <span className="chevron">⌄</span>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item}
              className={activeView === item ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveView(item)}
            >
              <span className={`nav-icon icon-${item.toLowerCase()}`} />
              {item}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="profile" onClick={handleLogout}>
            <span className="avatar">{initials(user.name)}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.role.replace('_', ' ')}</small>
            </span>
            <span className="more">Sign out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Workspace</span>
            <b>/</b>
            <strong>{activeView}</strong>
          </div>
          <div className="top-actions">
            <span className="avatar small">{initials(user.name)}</span>
          </div>
        </header>

        <div className="content-wrap">
          {activeView === 'Overview' && (
            <OverviewView
              user={user}
              projects={projects}
              onNavigate={() => setActiveView('Projects')}
              onCreate={() => setActiveView('Projects')}
            />
          )}
          {activeView === 'Projects' && (
            <ProjectsView
              user={user}
              projects={projects}
              tenants={tenants}
              onRefresh={refreshProjects}
            />
          )}
          {activeView === 'People' && (
            <PeopleView
              user={user}
              users={users}
              tenants={tenants}
              permissions={permissions}
              onRefresh={async () => {
                await refreshUsers();
                await refreshPermissions();
              }}
            />
          )}
          {activeView === 'Permissions' && (
            <PermissionsView
              permissions={permissions}
              onRefresh={refreshPermissions}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function OverviewView({ user, projects, onNavigate }) {
  const visible = filterProjects(projects, user, '', 'All projects');
  const counts = {
    active: visible.filter((p) => p.status === 'IN_PROGRESS').length,
    planning: visible.filter((p) => p.status === 'PLANNING').length,
    completed: visible.filter((p) => p.status === 'COMPLETED').length,
  };

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">{user.role === 'SUPER_ADMIN' ? 'System overview' : 'Project dashboard'}</p>
          <h1>Good morning, {user.name.split(' ')[0]} <span>✦</span></h1>
          <p className="muted">Track projects across your {user.role === 'SUPER_ADMIN' ? 'tenants' : 'workspace'}.</p>
        </div>
      </section>
      <section className="metric-grid">
        <Metric label="Active projects" value={counts.active} accent="coral" />
        <Metric label="In planning" value={counts.planning} accent="yellow" />
        <Metric label="Completed" value={counts.completed} accent="green" />
        <Metric label="Total projects" value={visible.length} accent="blue" />
      </section>
      <section className="project-section">
        <div className="section-heading">
          <div>
            <h2>Recent projects</h2>
            <p className="muted">Latest activity in your workspace.</p>
          </div>
          <button className="text-button" onClick={onNavigate}>View all <span>→</span></button>
        </div>
        <ProjectTable projects={visible.slice(0, 5)} user={user} compact />
      </section>
    </>
  );
}

function ProjectsView({ user, projects, tenants, onRefresh }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All projects');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const visible = filterProjects(projects, user, query, filter);
  const canCreate = hasPermission(user, 'projects:create');
  const canUpdate = hasPermission(user, 'projects:update');
  const canDelete = hasPermission(user, 'projects:delete');

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await api.createProject({
        name: form.get('name'),
        description: form.get('description'),
        status: form.get('status'),
        priority: form.get('priority'),
        dueDate: form.get('dueDate') || null,
        tenantId: user.role === 'SUPER_ADMIN' ? Number(form.get('tenantId')) : user.tenantId,
      });
      setShowCreate(false);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await api.updateProject(editing.id, {
        name: form.get('name'),
        description: form.get('description'),
        status: form.get('status'),
        priority: form.get('priority'),
        dueDate: form.get('dueDate') || null,
      });
      setEditing(null);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this project?')) return;
    try {
      await api.deleteProject(id);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Project management</p>
          <h1>Projects</h1>
          <p className="muted">Create, update, and track work items.</p>
        </div>
        {canCreate && (
          <button className="primary-button" onClick={() => setShowCreate(true)}>
            <span>＋</span> New project
          </button>
        )}
      </section>

      {error && <p className="banner-error">{error}</p>}

      <div className="toolbar">
        <div className="search">
          <span>⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option>All projects</option>
          <option>In progress</option>
          <option>Planning</option>
          <option>Completed</option>
          <option>On hold</option>
        </select>
      </div>

      <ProjectTable
        projects={visible}
        user={user}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={setEditing}
        onDelete={handleDelete}
      />

      {showCreate && (
        <Modal title="Create a project" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <label>Project name<input name="name" required placeholder="e.g. Customer portal" /></label>
            <label>Description<textarea name="description" placeholder="What does success look like?" /></label>
            {user.role === 'SUPER_ADMIN' && (
              <label>Tenant
                <select name="tenantId" required defaultValue="">
                  <option value="" disabled>Select tenant</option>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
            )}
            <div className="form-row">
              <label>Status
                <select name="status" defaultValue="PLANNING">
                  <option value="PLANNING">Planning</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="ON_HOLD">On hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </label>
              <label>Priority
                <select name="priority" defaultValue="MEDIUM">
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="LOW">Low</option>
                </select>
              </label>
            </div>
            <label>Due date<input type="date" name="dueDate" /></label>
            <button className="primary-button" type="submit">Create project</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Edit project" onClose={() => setEditing(null)}>
          <form onSubmit={handleUpdate}>
            <label>Project name<input name="name" required defaultValue={editing.name} /></label>
            <label>Description<textarea name="description" defaultValue={editing.description} /></label>
            <div className="form-row">
              <label>Status
                <select name="status" defaultValue={editing.status}>
                  <option value="PLANNING">Planning</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="ON_HOLD">On hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </label>
              <label>Priority
                <select name="priority" defaultValue={editing.priority}>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="LOW">Low</option>
                </select>
              </label>
            </div>
            <label>Due date<input type="date" name="dueDate" defaultValue={editing.due_date?.slice(0, 10)} /></label>
            <button className="primary-button" type="submit">Save changes</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function PeopleView({ user, users, tenants, permissions, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingPerms, setEditingPerms] = useState(null);
  const [error, setError] = useState('');

  const creatableRole = user.role === 'SUPER_ADMIN' ? 'ADMIN' : 'AGENT';
  const visibleUsers = users.filter((u) => {
    if (user.role === 'SUPER_ADMIN') return u.role !== 'SUPER_ADMIN' || u.id === user.id;
    return u.role === 'AGENT';
  });

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const selectedPerms = permissions
      .map((p) => p.key)
      .filter((key) => form.get(`perm-${key}`) === 'on');

    try {
      await api.createUser({
        name: form.get('name'),
        email: form.get('email'),
        password: form.get('password'),
        role: creatableRole,
        tenantId: user.role === 'SUPER_ADMIN' ? Number(form.get('tenantId')) : user.tenantId,
        permissions: creatableRole === 'AGENT' ? selectedPerms : [],
      });
      setShowCreate(false);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleStatus(target) {
    try {
      await api.updateUserStatus(target.id, !target.isActive);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function savePermissions(event) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const selected = permissions.map((p) => p.key).filter((key) => form.get(`perm-${key}`) === 'on');
    try {
      await api.setUserPermissions(editingPerms.id, selected);
      setEditingPerms(null);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Team management</p>
          <h1>People</h1>
          <p className="muted">
            {user.role === 'SUPER_ADMIN'
              ? 'Manage Admin users across tenants.'
              : 'Create and manage Agents in your workspace.'}
          </p>
        </div>
        <button className="primary-button" onClick={() => setShowCreate(true)}>
          <span>＋</span> Add {creatableRole === 'ADMIN' ? 'admin' : 'agent'}
        </button>
      </section>

      {error && <p className="banner-error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Workspace</th>
              <th>Status</th>
              <th>Permissions</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td><span className="role-badge">{u.role.replace('_', ' ')}</span></td>
                <td>{u.tenantName || '—'}</td>
                <td>
                  <span className={`status ${u.isActive ? 'completed' : 'on_hold'}`}>
                    <i />{u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td>
                  {u.role === 'AGENT'
                    ? (u.permissions?.length ? u.permissions.join(', ') : 'View only')
                    : 'Full access'}
                </td>
                <td className="actions-cell">
                  {(u.role === 'AGENT' || (user.role === 'SUPER_ADMIN' && u.role === 'ADMIN')) && (
                    <button className="text-button" onClick={() => toggleStatus(u)}>
                      {u.isActive ? 'Disable' : 'Enable'}
                    </button>
                  )}
                  {u.role === 'AGENT' && (
                    <button className="text-button" onClick={() => setEditingPerms(u)}>Permissions</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleUsers.length && <div className="empty-state">No team members yet.</div>}
      </div>

      {showCreate && (
        <Modal title={`Add ${creatableRole.toLowerCase()}`} onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <label>Name<input name="name" required /></label>
            <label>Email<input name="email" type="email" required /></label>
            <label>Password<input name="password" type="password" required minLength={8} placeholder="Min 8 characters" /></label>
            {user.role === 'SUPER_ADMIN' && (
              <label>Tenant
                <select name="tenantId" required defaultValue="">
                  <option value="" disabled>Select tenant</option>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
            )}
            {creatableRole === 'AGENT' && (
              <fieldset className="perm-fieldset">
                <legend>Initial permissions</legend>
                {permissions.map((p) => (
                  <label key={p.key} className="checkbox-label">
                    <input type="checkbox" name={`perm-${p.key}`} />
                    {p.label}
                  </label>
                ))}
              </fieldset>
            )}
            <button className="primary-button" type="submit">Create user</button>
          </form>
        </Modal>
      )}

      {editingPerms && (
        <Modal title={`Permissions — ${editingPerms.name}`} onClose={() => setEditingPerms(null)}>
          <form onSubmit={savePermissions}>
            <fieldset className="perm-fieldset">
              {permissions.map((p) => (
                <label key={p.key} className="checkbox-label">
                  <input
                    type="checkbox"
                    name={`perm-${p.key}`}
                    defaultChecked={editingPerms.permissions?.includes(p.key)}
                  />
                  {p.label}
                </label>
              ))}
            </fieldset>
            <button className="primary-button" type="submit">Save permissions</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function PermissionsView({ permissions, onRefresh }) {
  const [error, setError] = useState('');
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    try {
      await api.createPermission({ key, label });
      setKey('');
      setLabel('');
      await onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(permKey) {
    if (!window.confirm(`Delete permission "${permKey}"?`)) return;
    try {
      await api.deletePermission(permKey);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">System configuration</p>
          <h1>Permissions</h1>
          <p className="muted">Define permissions that can be granted to Agents by Admins.</p>
        </div>
      </section>

      {error && <p className="banner-error">{error}</p>}

      <form className="inline-form" onSubmit={handleCreate}>
        <label>Key<input value={key} onChange={(e) => setKey(e.target.value)} placeholder="projects:archive" required /></label>
        <label>Label<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Archive projects" required /></label>
        <button className="primary-button" type="submit">Add permission</button>
      </form>

      <div className="table-wrap" style={{ marginTop: 20 }}>
        <table>
          <thead>
            <tr><th>Key</th><th>Label</th><th /></tr>
          </thead>
          <tbody>
            {permissions.map((p) => (
              <tr key={p.key}>
                <td><code>{p.key}</code></td>
                <td>{p.label}</td>
                <td><button className="text-button danger" onClick={() => handleDelete(p.key)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProjectTable({ projects, user, canUpdate, canDelete, onEdit, onDelete, compact }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            {user.role === 'SUPER_ADMIN' && <th>Workspace</th>}
            <th>Status</th>
            <th>Priority</th>
            <th>Due date</th>
            <th>Owner</th>
            {!compact && (canUpdate || canDelete) && <th />}
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>
                <div className="project-name">
                  <span className={`project-symbol ${project.priority.toLowerCase()}`}>
                    {project.name.slice(0, 1)}
                  </span>
                  <span>
                    <strong>{project.name}</strong>
                    <small>{project.description}</small>
                  </span>
                </div>
              </td>
              {user.role === 'SUPER_ADMIN' && (
                <td><span className="workspace-label">{project.tenant_name}</span></td>
              )}
              <td>
                <span className={`status ${project.status.toLowerCase()}`}>
                  <i />{STATUS_LABELS[project.status]}
                </span>
              </td>
              <td><span className={`priority ${project.priority.toLowerCase()}`}>{project.priority}</span></td>
              <td>
                {project.due_date
                  ? new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—'}
              </td>
              <td>
                <span className="owner">
                  <span className="avatar tiny">{initials(project.owner_name)}</span>
                  {project.owner_name || '—'}
                </span>
              </td>
              {!compact && (canUpdate || canDelete) && (
                <td className="actions-cell">
                  {canUpdate && <button className="text-button" onClick={() => onEdit?.(project)}>Edit</button>}
                  {canDelete && <button className="text-button danger" onClick={() => onDelete?.(project.id)}>Delete</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!projects.length && <div className="empty-state">No projects match your filters.</div>}
    </div>
  );
}

function Login({ onLogin, error, setError }) {
  const [email, setEmail] = useState('admin@northstar.local');
  const [password, setPassword] = useState('password123');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-art">
        <div className="art-copy">
          <div className="brand light"><span className="brand-mark">N</span><span>northstar</span></div>
          <h1>Make progress<br /><em>visible.</em></h1>
          <p>A multi-tenant project management workspace with role-based access control.</p>
        </div>
        <div className="art-lines" />
      </div>
      <div className="login-panel">
        <div className="login-form">
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to your workspace</h2>
          <p className="muted">Use a demo account to explore RBAC and tenant isolation.</p>
          <form onSubmit={handleSubmit}>
            <label>Email address
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button full" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Continue'} <span>→</span>
            </button>
          </form>
          <div className="demo-accounts">
            <small>Demo accounts (password: password123)</small>
            {[
              ['super@northstar.local', 'Super Admin', 'AS'],
              ['admin@northstar.local', 'Admin', 'MC'],
              ['agent@northstar.local', 'Agent (update only)', 'LM'],
            ].map(([addr, label, av]) => (
              <button key={addr} type="button" onClick={() => setEmail(addr)}>
                <span className="avatar tiny">{av}</span>
                <span><strong>{label}</strong><small>{addr}</small></span>
                <b>→</b>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div className="metric">
      <div className={`metric-icon ${accent}`}><span>◈</span></div>
      <div><p>{label}</p><strong>{value}</strong></div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="close-button" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function filterProjects(projects, user, query, filter) {
  return projects.filter((project) => {
    const matchesFilter = filter === 'All projects' || STATUS_LABELS[project.status] === filter;
    const matchesQuery = `${project.name} ${project.description}`.toLowerCase().includes(query.toLowerCase());
    const matchesTenant = user.role === 'SUPER_ADMIN'
      || project.tenant_id === user.tenantId
      || project.tenant_name === user.tenantName;
    return matchesFilter && matchesQuery && matchesTenant;
  });
}

function initials(name) {
  return (name || '?').split(' ').map((part) => part[0]).join('').slice(0, 2);
}

export default App;
