import { request } from "./axiosClient";

export const authApi = {
  login: (email, password) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request("/api/me"),
};
