import { createContext, useContext, useEffect, useState } from 'react';
import { permissionApi } from '../api/permission.api';
import { projectApi } from '../api/project.api';
import { tenantApi } from '../api/tenant.api';
import { userApi } from '../api/user.api';
import { hasPermission } from '../utils/permissions';
import { useAuth } from './AuthContext';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [permissions, setPermissions] = useState([]);

  async function refresh() {
    if (!user) return;
    const [projectList, tenantList, permissionList, userList] = await Promise.all([
      hasPermission(user, 'projects.read') ? projectApi.list() : [],
      hasPermission(user, 'users.read') ? tenantApi.list() : [],
      hasPermission(user, 'users.read') ? permissionApi.list() : [],
      hasPermission(user, 'users.read') ? userApi.list() : [],
    ]);
    setProjects(projectList);
    setTenants(tenantList);
    setPermissions(permissionList);
    setUsers(userList);
    return {
      projects: projectList,
      tenants: tenantList,
      permissions: permissionList,
      users: userList,
    };
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, [user]);

  return (
    <TenantContext.Provider
      value={{
        projects,
        users,
        tenants,
        permissions,
        refresh,
        setProjects,
        setUsers,
        setTenants,
        setPermissions,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantData() {
  return useContext(TenantContext);
}
