import { useState } from "react";
import { hasPermission } from "../utils/permissions";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/AuthContext";
import { useTenantData } from "../context/TenantContext";
import Login from "../features/auth/pages/Login";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import TenantList from "../features/tenants/pages/TenantList";
import PeopleList from "../features/people/pages/PeopleList";
import ProjectList from "../features/projects/pages/ProjectList";
import PermissionManagement from "../features/permissions/pages/PermissionManagement";
import Loader from "../components/common/Loader";

export default function AppRoutes() {
  const { user, loading, signIn, signOut } = useAuth();
  const data = useTenantData();
  const [view, setView] = useState("Overview");
  const [error, setError] = useState("");
  if (loading) return <Loader />;
  if (!user)
    return (
      <Login
        onLogin={signIn}
        error={error}
        setError={setError}
      />
    );
  const navItems = [
    "Overview",
    ...(user.role === "SUPER_ADMIN" && hasPermission(user, "users.read")
      ? ["Tenants"]
      : []),
    ...(hasPermission(user, "projects.read") ? ["Projects"] : []),
    ...(hasPermission(user, "users.read") ? ["People"] : []),
    ...(hasPermission(user, "permissions.manage") ? ["Permissions"] : []),
  ];
  function content() {
    if (view === "Tenants")
      return <TenantList user={user} {...data} onRefresh={data.refresh} />;
    if (view === "Projects")
      return <ProjectList user={user} {...data} onRefresh={data.refresh} />;
    if (view === "People")
      return <PeopleList user={user} {...data} onRefresh={data.refresh} />;
    if (view === "Permissions")
      return (
        <PermissionManagement
          permissions={data.permissions}
          onRefresh={data.refresh}
        />
      );
    return (
      <DashboardPage
        user={user}
        projects={data.projects}
        onNavigate={() => setView("Projects")}
      />
    );
  }
  return (
    <MainLayout
      {...{
        user,
        activeView: view,
        navItems,
        onNavigate: setView,
        onLogout: signOut,
      }}
    >
      {content()}
    </MainLayout>
  );
}
