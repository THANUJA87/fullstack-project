import { initials } from "../../utils/helpers";

export default function Header({ user, activeView }) {
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <span>Workspace</span>
        <b>/</b>
        <strong>{activeView}</strong>
      </div>
      <div className="top-actions">
        <span className="avatar small">{initials(user.name)}</span>
      </div>
    </header>
  );
}
