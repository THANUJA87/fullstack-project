import { STATUS_LABELS } from '../constants';
import { initials } from '../utils';

export default function ProjectTable({ projects, user, canUpdate, canDelete, onEdit, onDelete, compact }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            {user.role === 'SUPER_ADMIN' && <th>Workspace</th>}
            <th>Status</th>
            <th>Address</th>
            <th>Owner</th>
            {!compact && (canUpdate || canDelete) && <th />}
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>
                <div className="project-name">
                  <span className={`project-symbol ${project.status.toLowerCase()}`}>{project.name.slice(0, 1)}</span>
                  <span><strong>{project.name}</strong><small>{project.use_case}</small></span>
                </div>
              </td>
              {user.role === 'SUPER_ADMIN' && <td><span className="workspace-label">{project.tenant_name}</span></td>}
              <td><span className={`status ${project.status.toLowerCase()}`}><i />{STATUS_LABELS[project.status]}</span></td>
              <td>{project.address}</td>
              <td><span className="owner"><span className="avatar tiny">{initials(project.owner_name)}</span>{project.owner_name || '—'}</span></td>
              {!compact && (canUpdate || canDelete) && (
                <td className="actions-cell">
                  {canUpdate && <button className="text-button" onClick={() => onEdit?.(project)}>Edit</button>}
                  {canDelete && <button className="text-button danger" onClick={() => onDelete?.(project.id)}>Delete</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!projects.length && <div className="empty-state">No projects match your filters.</div>}
    </div>
  );
}
