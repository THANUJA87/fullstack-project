import StatusBadge from "../../../components/common/StatusBadge";
import { KeyRound } from "lucide-react";

export default function PeopleTable({
  currentUser,
  users,
  onToggle,
  onPermissions,
}) {
  return (
    <div className="table-wrap people-table-wrap">
      <table className="people-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Workspace</th>
            <th>Status</th>
            <th>Enabled</th>
            <th>Permissions</th>
            <th>Manage</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const canToggle =
              user.role === "AGENT" ||
              (currentUser.role === "SUPER_ADMIN" && user.role === "ADMIN");
            const permissions =
              user.role === "AGENT" ? user.permissions || [] : [];
            return (
              <tr key={user.id}>
                <td>
                  <strong className="person-name">{user.name}</strong>
                </td>
                <td className="person-email">{user.email}</td>
                <td>
                  <span className="role-badge">
                    {user.role.replace("_", " ")}
                  </span>
                </td>
                <td>{user.tenantName || "—"}</td>
                <td>
                  <StatusBadge active={user.isActive}>
                    {user.isActive ? "Active" : "Disabled"}
                  </StatusBadge>
                </td>
                <td className="people-toggle-cell">
                  {canToggle && (
                    <label
                      className="status-toggle"
                      title={user.isActive ? "Disable user" : "Enable user"}
                    >
                      <input
                        type="checkbox"
                        checked={user.isActive}
                        onChange={() => onToggle(user)}
                        aria-label={`${user.isActive ? "Disable" : "Enable"} ${user.name}`}
                      />
                      <span />
                    </label>
                  )}
                </td>
                <td>
                  {user.role === "AGENT" ? (
                    <span className="permission-summary">
                      {permissions.length
                        ? permissions.join(", ")
                        : "No project access"}
                    </span>
                  ) : (
                    <span className="permission-summary">Full access</span>
                  )}
                </td>
                <td className="people-permission-cell">
                  {user.role === "AGENT" && onPermissions && (
                    <button
                      className="permission-icon"
                      type="button"
                      title="Manage project permissions"
                      aria-label={`Manage permissions for ${user.name}`}
                      onClick={() => onPermissions(user)}
                    >
                      <KeyRound size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!users.length && <div className="empty-state">No people found.</div>}
    </div>
  );
}
