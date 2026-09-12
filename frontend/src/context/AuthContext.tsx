import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AdminUser } from '../types';
import { api, setAuthToken, registerUser } from '../api';

interface AuthContextType {
  user: AdminUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'CMD_ADMIN';

  const updateToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    setAuthToken(token);
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const response = await api.post('/api/auth/refresh');
      if (response.data && response.data.access_token) {
        updateToken(response.data.access_token);
        if (response.data.user) {
          setUser(response.data.user);
        }
        return true;
      }
      return false;
    } catch {
      updateToken(null);
      setUser(null);
      return false;
    }
  }, [updateToken]);

  const login = async (email: string, password: string): Promise<void> => {
    const response = await api.post('/api/auth/login', { email, password });
    if (response.data && response.data.access_token) {
      updateToken(response.data.access_token);
      if (response.data.user) {
        setUser(response.data.user);
      }
    } else {
      throw new Error('Invalid login response');
    }
  };

  const register = async (name: string, email: string, password: string, role?: string): Promise<void> => {
    const data = await registerUser({ name, email, password, role });
    if (data && data.access_token) {
      updateToken(data.access_token);
      if (data.user) {
        setUser(data.user);
      }
    } else {
      throw new Error('Invalid registration response');
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      updateToken(null);
      setUser(null);
    }
  };

  // Attempt initial session restore on mount
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        await refreshSession();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    initAuth();
    return () => {
      isMounted = false;
    };
  }, [refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isSuperAdmin,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
