export default function PermissionTable({ permissions, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Label</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {permissions.map((permission) => (
            <tr key={permission.key}>
              <td>
                <code>{permission.key}</code>
              </td>
              <td>{permission.label}</td>
              <td>
                <button className="text-button danger" onClick={() => onDelete(permission.key)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
