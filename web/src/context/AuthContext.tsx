import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client.js';
import type { User } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('leaddesk_user');
      const token = localStorage.getItem('leaddesk_access_token');
      return savedUser && token ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [isLoading] = useState(false);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
    };

    window.addEventListener('auth:logout', handleSessionExpired);
    return () => window.removeEventListener('auth:logout', handleSessionExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', {
      email,
      password,
    });

    localStorage.setItem('leaddesk_access_token', data.accessToken);
    localStorage.setItem('leaddesk_refresh_token', data.refreshToken);
    localStorage.setItem('leaddesk_user', JSON.stringify(data.user));

    setUser(data.user);
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Continue client cleanup even if network request fails
    } finally {
      localStorage.removeItem('leaddesk_access_token');
      localStorage.removeItem('leaddesk_refresh_token');
      localStorage.removeItem('leaddesk_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
