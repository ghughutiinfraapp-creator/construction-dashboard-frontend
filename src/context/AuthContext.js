'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

// ─── DEV BYPASS ─────────────────────────────────────────────────────
// Set NEXT_PUBLIC_BYPASS_AUTH=true in .env.local to skip login entirely.
// Change BYPASS_ROLE below to impersonate any role during development.
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
const BYPASS_USER = {
  id: 'dev-user-001',
  name: 'Dev Admin',
  email: 'admin@construction.com',
  role: 'SUPER_ADMIN',   // ← change to: PROJECT_MANAGER | FINANCE | SITE_ENGINEER | CLIENT
  avatar: null,
  phone: null,
};
// ────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(BYPASS_AUTH ? BYPASS_USER : null);
  const [loading, setLoading] = useState(!BYPASS_AUTH);

  const loadUser = useCallback(async () => {
    if (BYPASS_AUTH) return; // skip API call entirely
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) { setLoading(false); return; }
      const { data } = await authAPI.me();
      setUser(data.user);
    } catch {
      localStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    if (BYPASS_AUTH) { setUser(BYPASS_USER); return BYPASS_USER; }
    const { data } = await authAPI.login(email, password);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    if (BYPASS_AUTH) return; // no-op in bypass mode
    try { await authAPI.logout(); } catch {}
    localStorage.clear();
    setUser(null);
  };

  const hasRole = (...roles) => user && roles.includes(user.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};