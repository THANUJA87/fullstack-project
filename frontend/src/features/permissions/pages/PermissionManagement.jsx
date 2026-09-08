import { useEffect, useState } from 'react';
import { permissionSchema, validationMessage } from '../../../validation/schemas';
import permissionService from '../permission.service';

const roles = ['SUPER_ADMIN', 'ADMIN', 'AGENT'];
const groups = [
  { key: 'users', label: 'Users', description: 'Manage people and account status.' },
  { key: 'projects', label: 'Projects', description: 'Control project visibility and actions.' },
  { key: 'tenants', label: 'Tenants', description: 'Manage workspaces and access settings.' },
];

function permissionGroup(permissionKey) {
  if (permissionKey.startsWith('users.')) return 'users';
  if (permissionKey.startsWith('projects.')) return 'projects';
  return 'tenants';
}

export default function PermissionManagement({ permissions, onRefresh }) {
  const [rolePermissions, setRolePermissions] = useState({});
  const [savingRole, setSavingRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all(roles.map(async (role) => [role, await permissionService.rolePermissions(role)]))
      .then((entries) => {
        if (active)
          setRolePermissions(
            Object.fromEntries(
              entries.map(([role, items]) => [
                role,
                items.filter((item) => item.enabled).map((item) => item.key),
              ])
            )
          );
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [permissions]);

  function toggle(role, permissionKey) {
    setRolePermissions((current) => {
      const currentKeys = current[role] || [];
      const nextKeys = currentKeys.includes(permissionKey)
        ? currentKeys.filter((keyName) => keyName !== permissionKey)
        : [...currentKeys, permissionKey];
      return { ...current, [role]: nextKeys };
    });
  }

  async function saveRole(role) {
    setSavingRole(role);
    setError('');
    try {
      await permissionService.updateRolePermissions(role, rolePermissions[role] || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingRole('');
    }
  }

  async function createPermission(event) {
    event.preventDefault();
    const result = permissionSchema.safeParse({ key, label });
    if (!result.success) {
      setError(validationMessage(result));
      return;
    }
    try {
      await permissionService.create(result.data);
      setKey('');
      setLabel('');
      await onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Access control</p>
          <h1>Role permissions</h1>
          <p className="muted">Choose what each role can see and do across the workspace.</p>
        </div>
      </section>
      {error && <p className="banner-error">{error}</p>}
      {loading ? (
        <div className="loading-screen permission-loading">Loading role permissions…</div>
      ) : (
        <div className="role-permission-grid">
          {roles.map((role) => (
            <section className="role-permission-card" key={role}>
              <div className="role-permission-header">
                <div>
                  <span className="role-badge">{role.replace('_', ' ')}</span>
                  <h2>
                    {role === 'SUPER_ADMIN' ? 'Super Admin' : role[0] + role.slice(1).toLowerCase()}
                  </h2>
                </div>
                <span className="permission-count">
                  {(rolePermissions[role] || []).length} enabled
                </span>
              </div>
              <div className="permission-groups">
                {groups.map((group) => {
                  const groupPermissions = permissions.filter(
                    (permission) => permissionGroup(permission.key) === group.key
                  );
                  return (
                    <div className="permission-group" key={group.key}>
                      <div className="permission-group-heading">
                        <h3>{group.label}</h3>
                        <small>{group.description}</small>
                      </div>
                      {groupPermissions.map((permission) => (
                        <label className="permission-check" key={permission.key}>
                          <input
                            type="checkbox"
                            checked={(rolePermissions[role] || []).includes(permission.key)}
                            onChange={() => toggle(role, permission.key)}
                          />
                          <span>
                            <strong>{permission.label}</strong>
                            <small>{permission.key}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
              <button
                className="primary-button role-save"
                onClick={() => saveRole(role)}
                disabled={savingRole === role}
              >
                {savingRole === role
                  ? 'Saving…'
                  : `Save ${role.replace('_', ' ').toLowerCase()} permissions`}
              </button>
            </section>
          ))}
        </div>
      )}
      <section className="permission-catalog">
        <div>
          <h2>Add permission</h2>
          <p className="muted">Create a permission before assigning it to a role.</p>
        </div>
        <form className="inline-form" onSubmit={createPermission}>
          <label>
            Key
            <input
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="projects.archive"
              required
            />
          </label>
          <label>
            Label
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Archive projects"
              required
            />
          </label>
          <button className="secondary-button" type="submit">
            Add permission
          </button>
        </form>
      </section>
    </>
  );
}
