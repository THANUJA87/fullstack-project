import { request } from './axiosClient';

export const userApi = {
  list: () => request('/api/users'),
  create: (body) => request('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  updateStatus: (id, isActive) =>
    request(`/api/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  assignTenant: (id, tenantId) =>
    request(`/api/users/${id}/tenant`, {
      method: 'PATCH',
      body: JSON.stringify({ tenantId }),
    }),
  setPermissions: (id, permissions) =>
    request(`/api/users/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),
};
