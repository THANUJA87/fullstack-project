import ProjectTable from '../../../components/common/ProjectTable';
export default function RecentProjects({ projects, user, onNavigate }) {
  return (
    <section className="project-section">
      <div className="section-heading">
        <div>
          <h2>Recent projects</h2>
          <p className="muted">Latest activity in your workspace.</p>
        </div>
        <button className="text-button" onClick={onNavigate}>
          View all <span>→</span>
        </button>
      </div>
      <ProjectTable projects={projects.slice(0, 5)} user={user} compact />
    </section>
  );
}
