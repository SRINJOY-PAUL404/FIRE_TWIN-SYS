import React, { createContext, useContext } from 'react';
import type { AdminUser } from '../types';

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

const MOCK_USER: AdminUser = {
  id: 1,
  name: 'Administrator',
  email: 'admin@firetwin.local',
  role: 'super_admin',
  status: 'active',
  created_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const noop = async () => {};

  return (
    <AuthContext.Provider
      value={{
        user: MOCK_USER,
        accessToken: 'no-auth',
        isLoading: false,
        isSuperAdmin: true,
        login: noop,
        register: noop,
        logout: noop,
        refreshSession: async () => true,
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
