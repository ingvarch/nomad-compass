import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../ui/ThemeToggle';

export const LoginForm: React.FC = () => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate input
      if (!token.trim()) {
        throw new Error('Token is required');
      }

      // Login via server endpoint (server handles Nomad connection)
      const result = await login(token.trim());

      if (!result.success) {
        throw new Error(result.error || 'Failed to connect to Nomad. Please check your token.');
      }

      // Login successful - redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-monokai-bg">
        <div className="text-gray-600 dark:text-monokai-muted">Loading...</div>
      </div>
    );
  }

  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-monokai-bg relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="max-w-md w-full p-6 bg-white dark:bg-monokai-surface rounded-lg shadow-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-monokai-text">Nomad Compass</h1>
            <p className="text-gray-600 dark:text-monokai-muted">Sign in to manage your Nomad cluster</p>
          </div>

          {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-monokai-bg dark:text-monokai-red rounded-md text-sm">
                {error}
              </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-monokai-text mb-1">
                Nomad Token
              </label>
              <input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter your Nomad token"
                  className="w-full p-2 border border-gray-300 dark:border-monokai-muted rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-monokai-blue bg-white dark:bg-monokai-bg text-gray-900 dark:text-monokai-text"
                  disabled={isLoading}
              />
            </div>
            <button
                type="submit"
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-monokai-blue dark:hover:bg-blue-500 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-monokai-surface transition-colors disabled:opacity-50"
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
