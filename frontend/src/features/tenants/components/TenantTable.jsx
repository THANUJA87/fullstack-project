export default function TenantTable({ tenants, users, projects, selected, onSelect }) {
  return (
    <div className="tenant-list">
      {tenants.map((tenant) => {
        const admins = users.filter((user) => user.tenantId === tenant.id && user.role === 'ADMIN');
        const count = projects.filter((project) => project.tenant_id === tenant.id).length;
        return (
          <button
            key={tenant.id}
            className={`tenant-card ${selected === tenant.id ? 'active' : ''}`}
            onClick={() => onSelect(tenant.id)}
          >
            <strong>{tenant.name}</strong>
            <small>{tenant.slug}</small>
            <span>
              {admins.length} Admin{admins.length === 1 ? '' : 's'} · {count} project
              {count === 1 ? '' : 's'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
