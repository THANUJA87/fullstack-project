import StatCard from './StatCard';
export default function DashboardStats({ projects }) {
  return (
    <section className="metric-grid">
      <StatCard
        label="Active projects"
        value={projects.filter((p) => p.status === 'ACTIVE').length}
        accent="coral"
      />
      <StatCard
        label="Draft"
        value={projects.filter((p) => p.status === 'DRAFT').length}
        accent="yellow"
      />
      <StatCard
        label="Inactive"
        value={projects.filter((p) => p.status === 'INACTIVE').length}
        accent="green"
      />
      <StatCard label="Total projects" value={projects.length} accent="blue" />
    </section>
  );
}
