const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = localStorage.getItem("northstar_token");
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function hasPermission(user, permission) {
  return Boolean(user?.permissions?.includes(permission));
}
