import { initials } from '../../utils/helpers';

export default function Sidebar({ user, activeView, navItems, onNavigate, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">N</span>
        <span>Project Stack</span>
      </div>
      <div className="workspace-switcher">
        <span className="workspace-dot" />
        <span>
          <small>Workspace</small>
          {user.role === 'SUPER_ADMIN' ? 'All workspaces' : user.tenantName}
        </span>
        <span className="chevron">⌄</span>
      </div>
      <nav className="nav-list">
        {navItems.map((item) => (
          <button
            key={item}
            className={activeView === item ? 'nav-item active' : 'nav-item'}
            onClick={() => onNavigate(item)}
          >
            <span className={`nav-icon icon-${item.toLowerCase()}`} />
            {item}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className="profile" onClick={onLogout}>
          <span className="avatar">{initials(user.name)}</span>
          <span>
            <strong>{user.name}</strong>
            <small>{user.role.replace('_', ' ')}</small>
          </span>
          <span className="more">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
