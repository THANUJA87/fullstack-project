import { request } from "./axiosClient";

export const tenantApi = {
  list: () => request("/api/tenants"),
  create: (body) =>
    request("/api/tenants", { method: "POST", body: JSON.stringify(body) }),
};
