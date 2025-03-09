import { useClientEnvironment } from './ClientEnvironment';
import { useState, useEffect } from 'react';

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string | null;
  profileImage: string | null;
  createdAt: string;
  updatedAt: string;
}

export const AuthClient = {
  // Store token in localStorage
  setToken(token: string) {
    localStorage.setItem('auth_token', token);
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  removeToken() {
    localStorage.removeItem('auth_token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};

// React hook for authentication
export function useAuth() {
  const environment = useClientEnvironment();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = async () => {
    if (!AuthClient.isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Use fetch directly to avoid API structure issues
      const token = AuthClient.getToken();
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.status === 'success' && data.data?.user) {
        setUser(data.data.user);
      } else {
        // If we get a response but no user, token might be invalid
        AuthClient.removeToken();
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to load user:', err);
      // Clear token on auth error
      AuthClient.removeToken();
      setUser(null);
      setError('Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        if (data.data.requireTwoFactor) {
          // Return the 2FA requirement
          return { requireTwoFactor: true, userId: data.data.userId };
        }
        
        AuthClient.setToken(data.data.accessToken);
        setUser(data.data.user);
        return { success: true };
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
      return { success: false, error: err.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: { username: string; email: string; password: string; displayName: string }) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        AuthClient.setToken(data.data.accessToken);
        setUser(data.data.user);
        return { success: true };
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      return { success: false, error: err.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    AuthClient.removeToken();
    setUser(null);
  };

  // Load user on mount and when token changes
  useEffect(() => {
    loadUser();
  }, []);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    refreshUser: loadUser
  };
} 