import DashboardStats from '../components/DashboardStats';
import RecentProjects from '../components/RecentProjects';

export default function DashboardPage({ user, projects, onNavigate }) {
  const visible = projects.filter((project) => user.role === 'SUPER_ADMIN' || project.tenant_id === user.tenantId || project.tenant_name === user.tenantName);
  return <><section className="page-heading"><div><p className="eyebrow">{user.role === 'SUPER_ADMIN' ? 'System overview' : 'Project dashboard'}</p><h1>Good morning, {user.name.split(' ')[0]} <span>✦</span></h1><p className="muted">Track projects across your {user.role === 'SUPER_ADMIN' ? 'tenants' : 'workspace'}.</p></div></section><DashboardStats projects={visible} /><RecentProjects projects={visible} user={user} onNavigate={onNavigate} /></>;
}
