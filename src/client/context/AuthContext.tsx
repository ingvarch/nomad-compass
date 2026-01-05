import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  nomadAddr: string | null;
  isAuthenticated: boolean;
  login: (token: string, nomadAddr: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to get cookie value
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

// Helper function to set cookie
const setCookie = (name: string, value: string, days: number = 7): void => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict;`;
};

// Helper function to delete cookie
const deleteCookie = (name: string): void => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
};

const validateToken = async (token: string | null): Promise<boolean> => {
  if (!token) return false;

  try {
    // Use API proxy to validate token instead of direct request
    // This ensures CSRF protection and prevents SSRF
    const response = await fetch('/api/nomad/v1/agent/self', {
      headers: {
        'X-Nomad-Token': token,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

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

  // Load token and nomadAddr from cookies on initial render
  useEffect(() => {
    const cookieToken = getCookie('nomad-token');
    const storedNomadAddr = localStorage.getItem('nomad-addr'); // Keep nomadAddr in localStorage as it's not sensitive

    if (cookieToken && storedNomadAddr) {
      setToken(cookieToken);
      setNomadAddr(storedNomadAddr);
      setIsAuthenticated(true);
    }
  }, []);

  const login = (newToken: string, newNomadAddr: string) => {
    // Store token in cookie for better security
    setCookie('nomad-token', newToken);
    // Store nomadAddr in localStorage as it's not sensitive
    localStorage.setItem('nomad-addr', newNomadAddr);
    setToken(newToken);
    setNomadAddr(newNomadAddr);
    setIsAuthenticated(true);
  };

  const logout = () => {
    // Remove token from cookie
    deleteCookie('nomad-token');
    // Remove nomadAddr from localStorage
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
