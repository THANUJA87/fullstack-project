import { useCallback, useEffect, useState } from 'react';
import { api, hasPermission } from './api';
import Login from './components/Login';
import Modal from './components/Modal';
import ProjectTable from './components/ProjectTable';
import { permissionSchema, projectSchema, tenantSchema, userSchema, validationMessage } from './validation/schemas';
import { STATUS_LABELS } from './constants';
import { initials } from './utils';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('northstar_token')));
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
    if (!token) return;
    api.me()
      .then((profile) => {
        setUser(profile);
        return Promise.all([
          profile.permissions?.includes('projects.read') ? api.getProjects().then(setProjects) : null,
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
    await handleAuthenticated(data);
  }

  async function handleRegister(details) {
    const data = await api.register(details);
    await handleAuthenticated(data);
  }

  async function handleAuthenticated(data) {
    localStorage.setItem('northstar_token', data.token);
    setUser(data.user);
    setError('');
    const [projectList, tenantList, permissionList, userList] = await Promise.all([
      data.user.permissions?.includes('projects.read') ? api.getProjects() : [],
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
    return <Login onLogin={handleLogin} onRegister={handleRegister} error={error} setError={setError} />;
  }

  const navItems = [
    'Overview',
    ...(hasPermission(user, 'projects.read') ? ['Projects'] : []),
    ...(user.role !== 'AGENT' && hasPermission(user, 'users.read') ? ['People'] : []),
    ...(user.role === 'SUPER_ADMIN' && hasPermission(user, 'permissions.manage') ? ['Permissions'] : []),
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span>Project Stack</span>
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
          {activeView === 'Projects' && hasPermission(user, 'projects.read') && (
            <ProjectsView
              user={user}
              projects={projects}
              tenants={tenants}
              onRefresh={refreshProjects}
            />
          )}
          {activeView === 'People' && user.role !== 'AGENT' && hasPermission(user, 'users.read') && (
            <PeopleView
              user={user}
              users={users}
              tenants={tenants}
              permissions={permissions}
              onRefresh={async () => {
                await refreshUsers();
                await refreshPermissions();
                await refreshTenants();
              }}
            />
          )}
          {activeView === 'Permissions' && user.role === 'SUPER_ADMIN' && hasPermission(user, 'permissions.manage') && (
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
    active: visible.filter((p) => p.status === 'ACTIVE').length,
    planning: visible.filter((p) => p.status === 'DRAFT').length,
    completed: visible.filter((p) => p.status === 'INACTIVE').length,
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
        <Metric label="Draft" value={counts.planning} accent="yellow" />
        <Metric label="Inactive" value={counts.completed} accent="green" />
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
  const canCreate = hasPermission(user, 'projects.create');
  const canUpdate = hasPermission(user, 'projects.update');
  const canDelete = hasPermission(user, 'projects.delete');

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get('name'),
      address: form.get('address'),
      useCase: form.get('useCase'),
      status: form.get('status'),
      tenantId: user.role === 'SUPER_ADMIN' ? form.get('tenantId') : undefined,
    };
    const validation = projectSchema.safeParse(payload);
    if (!validation.success) {
      setError(validationMessage(validation));
      return;
    }
    try {
      await api.createProject(validation.data);
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
    const payload = {
      name: form.get('name'),
      address: form.get('address'),
      useCase: form.get('useCase'),
      status: form.get('status'),
    };
    const validation = projectSchema.safeParse(payload);
    if (!validation.success) {
      setError(validationMessage(validation));
      return;
    }
    try {
      await api.updateProject(editing.id, validation.data);
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
          <option>Active</option>
          <option>Inactive</option>
          <option>Draft</option>
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
            <label>Address<input name="address" required placeholder="Project address" /></label>
            <label>Use case<input name="useCase" required placeholder="What is this project for?" /></label>
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
                <select name="status" defaultValue="DRAFT">
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
            </div>
            <button className="primary-button" type="submit">Create project</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Edit project" onClose={() => setEditing(null)}>
          <form onSubmit={handleUpdate}>
            <label>Project name<input name="name" required defaultValue={editing.name} /></label>
            <label>Address<input name="address" required defaultValue={editing.address} /></label>
            <label>Use case<input name="useCase" required defaultValue={editing.use_case} /></label>
            <div className="form-row">
              <label>Status
                <select name="status" defaultValue={editing.status}>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
            </div>
            <button className="primary-button" type="submit">Save changes</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function PeopleView({ user, users, tenants, permissions, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [showAssignAdmin, setShowAssignAdmin] = useState(false);
  const [editingPerms, setEditingPerms] = useState(null);
  const [error, setError] = useState('');

  const creatableRole = user.role === 'SUPER_ADMIN' ? 'ADMIN' : 'AGENT';
  const visibleUsers = users.filter((u) => {
    if (user.role === 'SUPER_ADMIN') return u.role !== 'SUPER_ADMIN' || u.id === user.id;
    return u.role === 'AGENT';
  });
  const unassignedAdmins = users.filter((u) => u.role === 'ADMIN' && !u.tenantId);

  async function handleCreateTenant(event) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const validation = tenantSchema.safeParse({ name: form.get('name'), slug: form.get('slug') });
    if (!validation.success) {
      setError(validationMessage(validation));
      return;
    }
    try {
      await api.createTenant(validation.data);
      setShowCreateTenant(false);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAssignAdmin(event) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const adminId = form.get('adminId');
    const tenantId = form.get('tenantId');
    if (!adminId || !tenantId) {
      setError('Select an Admin and tenant');
      return;
    }
    try {
      await api.assignUserTenant(adminId, tenantId);
      setShowAssignAdmin(false);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const selectedPerms = permissions
      .map((p) => p.key)
      .filter((key) => form.get(`perm-${key}`) === 'on');
    const payload = {
      name: form.get('name'),
      email: form.get('email'),
      password: form.get('password'),
      tenantId: user.role === 'SUPER_ADMIN' ? form.get('tenantId') : user.tenantId,
      permissions: selectedPerms,
    };
    const validation = userSchema.safeParse(payload);
    if (!validation.success) {
      setError(validationMessage(validation));
      return;
    }

    try {
      await api.createUser({ ...validation.data, role: creatableRole });
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
        <div className="heading-actions">
          {user.role === 'SUPER_ADMIN' && <>
            <button className="secondary-button" onClick={() => setShowCreateTenant(true)}>＋ Create tenant</button>
            <button className="secondary-button" onClick={() => setShowAssignAdmin(true)} disabled={!unassignedAdmins.length}>Assign admin</button>
          </>}
          <button className="primary-button" onClick={() => setShowCreate(true)}>
            <span>＋</span> Add {creatableRole === 'ADMIN' ? 'admin' : 'agent'}
          </button>
        </div>
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
                <select name="tenantId" defaultValue="">
                  <option value="">Unassigned</option>
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

      {showCreateTenant && (
        <Modal title="Create tenant" onClose={() => setShowCreateTenant(false)}>
          <form onSubmit={handleCreateTenant}>
            <label>Tenant name<input name="name" required placeholder="e.g. Tenant A" /></label>
            <label>Tenant slug<input name="slug" required placeholder="tenant-a" /></label>
            <button className="primary-button" type="submit">Create tenant</button>
          </form>
        </Modal>
      )}

      {showAssignAdmin && (
        <Modal title="Assign Admin to tenant" onClose={() => setShowAssignAdmin(false)}>
          <form onSubmit={handleAssignAdmin}>
            <label>Admin
              <select name="adminId" required defaultValue="">
                <option value="" disabled>Select an Admin</option>
                {unassignedAdmins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name} ({admin.email})</option>)}
              </select>
            </label>
            <label>Tenant
              <select name="tenantId" required defaultValue="">
                <option value="" disabled>Select tenant</option>
                {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select>
            </label>
            <button className="primary-button" type="submit">Assign Admin</button>
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
    const validation = permissionSchema.safeParse({ key, label });
    if (!validation.success) {
      setError(validationMessage(validation));
      return;
    }
    try {
      await api.createPermission(validation.data);
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

function Metric({ label, value, accent }) {
  return (
    <div className="metric">
      <div className={`metric-icon ${accent}`}><span>◈</span></div>
      <div><p>{label}</p><strong>{value}</strong></div>
    </div>
  );
}

function filterProjects(projects, user, query, filter) {
  return projects.filter((project) => {
    const matchesFilter = filter === 'All projects' || STATUS_LABELS[project.status] === filter;
    const matchesQuery = `${project.name} ${project.address} ${project.use_case}`.toLowerCase().includes(query.toLowerCase());
    const matchesTenant = user.role === 'SUPER_ADMIN'
      || project.tenant_id === user.tenantId
      || project.tenant_name === user.tenantName;
    return matchesFilter && matchesQuery && matchesTenant;
  });
}

export default App;
