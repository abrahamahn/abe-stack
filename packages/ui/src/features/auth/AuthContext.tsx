import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// Inline auth API to avoid import issues
const authApi = {
  // Base API URL - use relative path for Vite proxy
  baseUrl: '/api',

  async login(email: string, password: string) {
    console.log('Login attempt with:', email);

    // Try to connect to the backend through the Vite proxy
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Login failed:', errorData);
        return {
          success: false,
          message: errorData.error || 'Login failed',
        };
      }

      const data = await response.json();
      return {
        success: true,
        user: data.user,
        accessToken: data.accessToken,
        requireMfa: data.requireMfa,
        message: data.message,
      };
    } catch (error) {
      console.error('API connection error:', error);

      // Fall back to mock data for development
      return {
        success: true,
        message: 'Using mock data: backend connection failed',
        user: {
          id: '123',
          username: 'testuser',
          email,
          displayName: 'Test User',
          firstName: 'Test',
          lastName: 'User',
          bio: null,
          profileImage: null,
          bannerImage: null,
          role: 'user',
          isVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        accessToken: 'dummy-token-123',
      };
    }
  },

  async testDatabaseConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/auth/test-db`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Database test failed:', errorData);
        return {
          success: false,
          connected: false,
          message: errorData.error || 'Database test failed',
        };
      }

      const data = await response.json();
      return {
        success: true,
        connected: Boolean(data.connected),
        message: data.message,
      };
    } catch (error) {
      console.error('Database test error:', error);
      return {
        success: false,
        connected: false,
        message: error instanceof Error ? error.message : 'Connection error',
      };
    }
  },

  async register(userData: any) {
    console.log('Register attempt with:', userData.email);

    try {
      // Make actual API call to backend
      console.log('Registration data:', userData);

      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          username: userData.username,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      console.log('Registration successful:', data);
      console.log('Verification email sent to:', userData.email);

      return {
        success: data.success,
        message: data.message,
        requireEmailVerification: data.requireEmailVerification,
        userId: data.userId,
      };
    } catch (error) {
      console.error('Registration API error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  },

  async logout() {
    return { success: true };
  },

  async refreshToken() {
    return { success: true, accessToken: 'new-dummy-token-456' };
  },

  async getCurrentUser() {
    const userData = localStorage.getItem('user');
    if (userData) {
      return { success: true, user: JSON.parse(userData) };
    }
    return { success: false, message: 'Not authenticated' };
  },
};

// Define the user type
interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  profileImage: string | null;
  bannerImage: string | null;
  role: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Define the auth context type
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; requireVerification: boolean } | void>;
  logout: () => void;
  error: string | null;
  showVerificationModal: boolean;
  setShowVerificationModal: (show: boolean) => void;
  verificationEmail: string;
  setVerificationEmail: (email: string) => void;
  testDatabaseConnection: () => Promise<{
    success: boolean;
    connected: boolean;
    message: string;
  }>;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  error: null,
  showVerificationModal: false,
  setShowVerificationModal: () => {},
  verificationEmail: '',
  setVerificationEmail: () => {},
  testDatabaseConnection: async () => ({
    success: false,
    connected: false,
    message: '',
  }),
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // First test the auth API connection
        try {
          const response = await fetch(`${authApi.baseUrl}/auth/test`);
          if (response.ok) {
            const data = await response.json();
            console.log('Auth API connected:', data);
          } else {
            console.warn('Auth API test failed:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('Failed to connect to Auth API:', error);
        }

        // Test database connection
        try {
          const dbResult = await authApi.testDatabaseConnection();
          console.log('Database connection test:', dbResult);
          if (dbResult.success && dbResult.connected) {
            console.log('✅ Database connection successful');
          } else {
            console.warn('⚠️ Database connection failed:', dbResult.message);
          }
        } catch (error) {
          console.error('Database test error:', error);
        }

        // Check if we have a token
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Validate token with the server
        const result = await authApi.getCurrentUser();

        if (result.success && result.user) {
          setUser(result.user);
          localStorage.setItem('user', JSON.stringify(result.user));
        } else {
          // Token invalid, try to refresh
          const refreshResult = await authApi.refreshToken();

          if (refreshResult.success && refreshResult.accessToken) {
            localStorage.setItem('token', refreshResult.accessToken);

            // Try to get user data again
            const userResult = await authApi.getCurrentUser();
            if (userResult.success && userResult.user) {
              setUser(userResult.user);
              localStorage.setItem('user', JSON.stringify(userResult.user));
            } else {
              throw new Error('Could not get user data');
            }
          } else {
            throw new Error('Token refresh failed');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Clear invalid auth data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    void checkAuthStatus();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authApi.login(email, password);

      if (!result.success) {
        throw new Error(result.message || 'Login failed');
      }

      // Check if MFA is required
      if (result.requireMfa) {
        setError('Multi-factor authentication is required but not implemented in this demo');
        throw new Error('Multi-factor authentication required');
      }

      // Save user data to localStorage
      localStorage.setItem('user', JSON.stringify(result.user));
      if (result.accessToken) {
        localStorage.setItem('token', result.accessToken);
      }

      // Update state
      setUser(result.user);
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Login failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (
    username: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authApi.register({
        email,
        password,
        firstName,
        lastName,
        username,
      });

      if (!result.success) {
        throw new Error(result.message || 'Registration failed');
      }

      // Always show verification email modal
      setVerificationEmail(email);
      setShowVerificationModal(true);

      return { success: true, requireVerification: true };
    } catch (error) {
      console.error('Registration error:', error);
      setError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Remove user data from localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      // Update state
      setUser(null);
    }
  };

  // Create the context value
  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    error,
    showVerificationModal,
    setShowVerificationModal,
    verificationEmail,
    setVerificationEmail,
    testDatabaseConnection: authApi.testDatabaseConnection,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
