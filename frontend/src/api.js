const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getToken() {
  return localStorage.getItem('northstar_token');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/me'),
  getProjects: () => request('/api/projects'),
  createProject: (body) => request('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
  updateProject: (id, body) => request(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProject: (id) => request(`/api/projects/${id}`, { method: 'DELETE' }),
  getUsers: () => request('/api/users'),
  createUser: (body) => request('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUserStatus: (id, isActive) => request(`/api/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  updateUser: (id, body) => request(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  assignUserTenant: (id, tenantId) => request(`/api/users/${id}/tenant`, { method: 'PATCH', body: JSON.stringify({ tenantId }) }),
  setUserPermissions: (id, permissions) => request(`/api/users/${id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) }),
  getTenants: () => request('/api/tenants'),
  createTenant: (body) => request('/api/tenants', { method: 'POST', body: JSON.stringify(body) }),
  getPermissions: () => request('/api/permissions'),
  getRolePermissions: (role) => request(`/api/permissions/roles/${role}/permissions`),
  updateRolePermissions: (role, permissions) => request(`/api/permissions/roles/${role}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) }),
  createPermission: (body) => request('/api/permissions', { method: 'POST', body: JSON.stringify(body) }),
  deletePermission: (key) => request(`/api/permissions/${encodeURIComponent(key)}`, { method: 'DELETE' }),
};

export function hasPermission(user, permission) {
  return Boolean(user?.permissions?.includes(permission));
}
