'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';

export const LoginForm: React.FC = () => {
  const [token, setToken] = useState('');
  const [nomadAddr, setNomadAddr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  // Try to get default Nomad address from config API
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const config = await response.json();
          if (config.nomadAddr) {
            setNomadAddr(config.nomadAddr);
          }
        }
      } catch (err) {
        console.error('Error fetching config:', err);
      }
    };

    fetchConfig();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate inputs
      if (!token.trim()) {
        throw new Error('Token is required');
      }

      if (!nomadAddr.trim()) {
        throw new Error('Nomad address is required');
      }

      // Ensure the nomadAddr has the correct format
      let formattedNomadAddr = nomadAddr.trim();
      if (!formattedNomadAddr.startsWith('http://') && !formattedNomadAddr.startsWith('https://')) {
        formattedNomadAddr = `http://${formattedNomadAddr}`;
      }

      // Validate the connection to Nomad
      const client = createNomadClient(formattedNomadAddr, token);
      const isValid = await client.validateConnection();

      if (!isValid) {
        throw new Error('Failed to connect to Nomad. Please check your token and address.');
      }

      // Login successful
      login(token, formattedNomadAddr);
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Nomad Compass</h1>
            <p className="text-gray-600">Sign in to manage your Nomad cluster</p>
          </div>

          {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {error}
              </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
                Nomad Token
              </label>
              <input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter your Nomad token"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
              />
            </div>
            <button
                type="submit"
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'Connect to Nomad'}
            </button>
          </form>
        </div>
      </div>
  );
};

export default LoginForm;
