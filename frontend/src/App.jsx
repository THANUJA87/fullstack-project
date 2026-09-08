import './App.css';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <AppRoutes />
      </TenantProvider>
    </AuthProvider>
  );
}
