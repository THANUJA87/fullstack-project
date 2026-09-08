import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/auth.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('northstar_token')));

  useEffect(() => {
    if (!localStorage.getItem('northstar_token')) return;
    authApi.me().then(setUser).catch(() => localStorage.removeItem('northstar_token')).finally(() => setLoading(false));
  }, []);

  async function signIn(email, password) {
    const data = await authApi.login(email, password);
    localStorage.setItem('northstar_token', data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(details) {
    const data = await authApi.register(details);
    localStorage.setItem('northstar_token', data.token);
    setUser(data.user);
    return data.user;
  }

  function signOut() {
    localStorage.removeItem('northstar_token');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, signIn, register, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
