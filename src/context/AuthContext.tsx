'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  nomadAddr: string | null;
  isAuthenticated: boolean;
  login: (token: string, nomadAddr: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [nomadAddr, setNomadAddr] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Load token and nomadAddr from localStorage on initial render
  useEffect(() => {
    const storedToken = localStorage.getItem('nomad-token');
    const storedNomadAddr = localStorage.getItem('nomad-addr');
    
    if (storedToken && storedNomadAddr) {
      setToken(storedToken);
      setNomadAddr(storedNomadAddr);
      setIsAuthenticated(true);
    }
  }, []);

  const login = (newToken: string, newNomadAddr: string) => {
    localStorage.setItem('nomad-token', newToken);
    localStorage.setItem('nomad-addr', newNomadAddr);
    setToken(newToken);
    setNomadAddr(newNomadAddr);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('nomad-token');
    localStorage.removeItem('nomad-addr');
    setToken(null);
    setNomadAddr(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        nomadAddr,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};