function sanitizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name || null,
    createdAt: row.created_at,
  };
}

module.exports = { sanitizeEmail, publicUser };
