'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiClient } from '@/lib/api-client';
import type { UserProfilePayload, AuthSessionPayload } from '@razor/api-client';

interface AuthContextType {
  user: UserProfilePayload | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isImpersonating: boolean;
  impersonatedBy: string | null;
  login: (userName: string, password: string, managementKey?: string) => Promise<{ success: boolean; error?: string }>;
  register: (params: {
    userName: string;
    password: string;
    accountName?: string;
    role?: 'Admin' | 'Operator' | 'Developer' | 'Trader';
    subscriptionTier?: 'Free' | 'Pro' | 'Enterprise';
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  startImpersonation: (session: AuthSessionPayload) => void;
  exitImpersonation: () => void;
  quickDemoLogin: (preset: 'admin' | 'operator' | 'trader') => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'razor_auth_token';
const USER_KEY = 'razor_auth_user';
const IMPERSONATION_BACKUP_TOKEN_KEY = 'razor_impersonation_backup_token';
const IMPERSONATION_BACKUP_USER_KEY = 'razor_impersonation_backup_user';
const IMPERSONATED_BY_KEY = 'razor_impersonated_by';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfilePayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedBy, setImpersonatedBy] = useState<string | null>(null);

  // Hydrate from localStorage on initial load
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      const backupToken = localStorage.getItem(IMPERSONATION_BACKUP_TOKEN_KEY);
      const byUser = localStorage.getItem(IMPERSONATED_BY_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }

      if (backupToken && byUser) {
        setIsImpersonating(true);
        setImpersonatedBy(byUser);
      }
    } catch {
      // Local storage read error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (userName: string, password: string, managementKey?: string) => {
    try {
      const client = getApiClient();
      const res = await client.POST('/api/auth/login', {
        body: {
          userName,
          password,
        },
      });

      if (res.data) {
        const session: AuthSessionPayload = res.data;
        const activeToken = managementKey?.trim() || session.token;
        setToken(activeToken);
        setUser(session.user);
        setIsImpersonating(false);
        setImpersonatedBy(null);

        localStorage.setItem(TOKEN_KEY, activeToken);
        localStorage.setItem(USER_KEY, JSON.stringify(session.user));
        localStorage.removeItem(IMPERSONATION_BACKUP_TOKEN_KEY);
        localStorage.removeItem(IMPERSONATION_BACKUP_USER_KEY);
        localStorage.removeItem(IMPERSONATED_BY_KEY);
        return { success: true };
      }

      return { success: false, error: 'Invalid username or password' };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Login failed' };
    }
  }, []);

  const register = useCallback(
    async (params: {
      userName: string;
      password: string;
      accountName?: string;
      role?: 'Admin' | 'Operator' | 'Developer' | 'Trader';
      subscriptionTier?: 'Free' | 'Pro' | 'Enterprise';
    }) => {
      try {
        const client = getApiClient();
        const res = await client.POST('/api/auth/register', {
          body: {
            userName: params.userName,
            password: params.password,
            accountName: params.accountName,
            role: params.role || 'Operator',
            subscriptionTier: params.subscriptionTier || 'Free',
          },
        });

        if (res.data) {
          const session: AuthSessionPayload = res.data;
          setToken(session.token);
          setUser(session.user);
          setIsImpersonating(false);
          setImpersonatedBy(null);

          localStorage.setItem(TOKEN_KEY, session.token);
          localStorage.setItem(USER_KEY, JSON.stringify(session.user));
          localStorage.removeItem(IMPERSONATION_BACKUP_TOKEN_KEY);
          localStorage.removeItem(IMPERSONATION_BACKUP_USER_KEY);
          localStorage.removeItem(IMPERSONATED_BY_KEY);
          return { success: true };
        }

        return { success: false, error: 'Registration failed' };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : 'Registration failed' };
      }
    },
    []
  );

  const startImpersonation = useCallback((session: AuthSessionPayload) => {
    if (typeof window === 'undefined') return;
    const currentToken = localStorage.getItem(TOKEN_KEY);
    const currentUser = localStorage.getItem(USER_KEY);

    if (currentToken && currentUser) {
      localStorage.setItem(IMPERSONATION_BACKUP_TOKEN_KEY, currentToken);
      localStorage.setItem(IMPERSONATION_BACKUP_USER_KEY, currentUser);
      try {
        const parsed = JSON.parse(currentUser);
        const adminName = parsed.userName || 'Admin';
        localStorage.setItem(IMPERSONATED_BY_KEY, adminName);
        setImpersonatedBy(adminName);
      } catch {
        localStorage.setItem(IMPERSONATED_BY_KEY, 'Admin');
        setImpersonatedBy('Admin');
      }
    }

    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    setToken(session.token);
    setUser(session.user);
    setIsImpersonating(true);
  }, []);

  const exitImpersonation = useCallback(() => {
    if (typeof window === 'undefined') return;
    const backupToken = localStorage.getItem(IMPERSONATION_BACKUP_TOKEN_KEY);
    const backupUser = localStorage.getItem(IMPERSONATION_BACKUP_USER_KEY);

    if (backupToken && backupUser) {
      localStorage.setItem(TOKEN_KEY, backupToken);
      localStorage.setItem(USER_KEY, backupUser);
      setToken(backupToken);
      try {
        setUser(JSON.parse(backupUser));
      } catch {
        setUser(null);
      }
    }

    localStorage.removeItem(IMPERSONATION_BACKUP_TOKEN_KEY);
    localStorage.removeItem(IMPERSONATION_BACKUP_USER_KEY);
    localStorage.removeItem(IMPERSONATED_BY_KEY);
    setIsImpersonating(false);
    setImpersonatedBy(null);
    window.location.href = '/panel/admin';
  }, []);

  const quickDemoLogin = useCallback(async (preset: 'admin' | 'operator' | 'trader') => {
    const creds = {
      admin: { name: 'admin-operator', pass: 'admin123' },
      operator: { name: 'dev-operator', pass: 'operator123' },
      trader: { name: 'pro-trader', pass: 'trader123' },
    }[preset];

    return login(creds.name, creds.pass);
  }, [login]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setIsImpersonating(false);
    setImpersonatedBy(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(IMPERSONATION_BACKUP_TOKEN_KEY);
      localStorage.removeItem(IMPERSONATION_BACKUP_USER_KEY);
      localStorage.removeItem(IMPERSONATED_BY_KEY);
    } catch {
      // Storage error
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        isImpersonating,
        impersonatedBy,
        login,
        register,
        logout,
        startImpersonation,
        exitImpersonation,
        quickDemoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const defaultAuthContext: AuthContextType = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isImpersonating: false,
  impersonatedBy: null,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
  startImpersonation: () => {},
  exitImpersonation: () => {},
  quickDemoLogin: async () => ({ success: false }),
};

export function useAuth() {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
}
