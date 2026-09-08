import { request } from './axiosClient';

export const permissionApi = {
  list: () => request('/api/permissions'),
  create: (body) => request('/api/permissions', { method: 'POST', body: JSON.stringify(body) }),
  remove: (key) =>
    request(`/api/permissions/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    }),
  rolePermissions: (role) => request(`/api/permissions/roles/${role}/permissions`),
  updateRolePermissions: (role, permissions) =>
    request(`/api/permissions/roles/${role}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),
};
