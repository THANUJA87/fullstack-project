export const isSuperAdmin = (user) => user?.role === 'SUPER_ADMIN';
export const isAdmin = (user) => user?.role === 'ADMIN';
export const isAgent = (user) => user?.role === 'AGENT';
