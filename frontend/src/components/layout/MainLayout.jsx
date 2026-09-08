import Sidebar from "./Sidebar";
import Header from "./Header";

export default function MainLayout({
  user,
  activeView,
  navItems,
  onNavigate,
  onLogout,
  children,
}) {
  return (
    <div className="app-shell">
      <Sidebar {...{ user, activeView, navItems, onNavigate, onLogout }} />
      <main className="main-content">
        <Header user={user} activeView={activeView} />
        <div className="content-wrap">{children}</div>
      </main>
    </div>
  );
}
