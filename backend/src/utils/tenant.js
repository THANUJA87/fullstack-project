function tenantFilter(user, column = 'tenant_id', startIndex = 1) {
  if (user.role === 'SUPER_ADMIN') return { sql: '', values: [] };
  return { sql: ` AND ${column} = $${startIndex}`, values: [user.tenantId] };
}

module.exports = { tenantFilter };
