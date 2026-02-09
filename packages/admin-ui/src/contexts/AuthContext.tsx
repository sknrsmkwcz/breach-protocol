import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { User, AuthResponse } from '@/types/api';
import { authApi } from '@/services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, isLoading: true, isAuthenticated: false, isAdmin: false,
  });
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  const setAuth = useCallback((auth: AuthResponse | null) => {
    if (auth) {
      setState({ user: auth.user, isLoading: false, isAuthenticated: true, isAdmin: auth.user.role === 'admin' });
      setRefreshToken(auth.refreshToken);
      sessionStorage.setItem('refreshToken', auth.refreshToken);
    } else {
      setState({ user: null, isLoading: false, isAuthenticated: false, isAdmin: false });
      setRefreshToken(null);
      sessionStorage.removeItem('refreshToken');
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    if (res.user.role !== 'admin') throw new Error('Admin access required');
    setAuth(res);
  }, [setAuth]);

  const logout = useCallback(async () => {
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    setAuth(null);
  }, [refreshToken, setAuth]);

  useEffect(() => {
    const stored = sessionStorage.getItem('refreshToken');
    if (!stored) { setState(s => ({ ...s, isLoading: false })); return; }
    authApi.refresh(stored)
      .then(res => { if (res.user.role === 'admin') setAuth(res); else setAuth(null); })
      .catch(() => setAuth(null));
  }, [setAuth]);

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
};
