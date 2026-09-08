import { STATUS_LABELS } from "../../utils/constants";
import { Pencil, Trash2 } from "lucide-react";

export default function ProjectTable({
  projects,
  user,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  compact,
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Use case</th>
            {user.role === "SUPER_ADMIN" && <th>Workspace</th>}
            <th>Status</th>
            <th>Address</th>
            {!compact && (canUpdate || canDelete) && <th />}
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>
                <div className="project-name">
                  <span
                    className={`project-symbol ${project.status.toLowerCase()}`}
                  >
                    {project.name.slice(0, 1)}
                  </span>
                  <strong>{project.name}</strong>
                </div>
              </td>
              <td>{project.use_case}</td>
              {user.role === "SUPER_ADMIN" && (
                <td>
                  <span className="workspace-label">{project.tenant_name}</span>
                </td>
              )}
              <td>
                <span className={`status ${project.status.toLowerCase()}`}>
                  <i />
                  {STATUS_LABELS[project.status]}
                </span>
              </td>
              <td>{project.address}</td>
              {!compact && (canUpdate || canDelete) && (
                <td className="actions-cell">
                  {canUpdate && (
                    <button
                      className="icon-action"
                      type="button"
                      title="Edit project"
                      aria-label={`Edit ${project.name}`}
                      onClick={() => onEdit?.(project)}
                    >
                      <Pencil size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className="icon-action danger"
                      type="button"
                      title="Delete project"
                      aria-label={`Delete ${project.name}`}
                      onClick={() => onDelete?.(project.id)}
                    >
                      <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!projects.length && (
        <div className="empty-state">No projects match your filters.</div>
      )}
    </div>
  );
}
