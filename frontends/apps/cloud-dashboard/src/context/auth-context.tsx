'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiClient } from '@/lib/api-client';
import type { UserProfilePayload, AuthSessionPayload } from '@razor/api-client';

interface AuthContextType {
  user: UserProfilePayload | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userName: string, password: string, managementKey?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  quickDemoLogin: (preset: 'admin' | 'operator' | 'developer' | 'trader') => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'razor_auth_token';
const USER_KEY = 'razor_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfilePayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on initial load
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
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

        localStorage.setItem(TOKEN_KEY, activeToken);
        localStorage.setItem(USER_KEY, JSON.stringify(session.user));
        return { success: true };
      }

      return { success: false, error: 'Invalid username or password' };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Login failed' };
    }
  }, []);

  const quickDemoLogin = useCallback(async (preset: 'admin' | 'operator' | 'developer' | 'trader') => {
    const creds = {
      admin: { name: 'admin-operator', pass: 'admin123' },
      operator: { name: 'dev-operator', pass: 'operator123' },
      developer: { name: 'algo-developer', pass: 'dev123' },
      trader: { name: 'pro-trader', pass: 'trader123' },
    }[preset];

    return login(creds.name, creds.pass);
  }, [login]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
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
        login,
        logout,
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
  login: async () => ({ success: false }),
  logout: () => {},
  quickDemoLogin: async () => ({ success: false }),
};

export function useAuth() {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
}
