import { request } from './axiosClient';

export const projectApi = {
  list: () => request('/api/projects'),
  create: (body) => request('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id) => request(`/api/projects/${id}`, { method: 'DELETE' }),
};
