import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

// Define API response types
interface ApiErrorResponse {
  message: string;
}

interface ApiAuthResponse {
  data: {
    user: User;
    accessToken: string;
    requireTwoFactor?: boolean;
  };
}

// Define the auth context type
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  showVerificationModal: boolean;
  setShowVerificationModal: (show: boolean) => void;
  verificationEmail: string;
  setVerificationEmail: (email: string) => void;
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
  setVerificationEmail: () => {}
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

  // Get the server port
  const getServerPort = (): number => {
    // In production, use the same port as the client
    if (process.env.NODE_ENV === 'production') {
      return window.location.port ? parseInt(window.location.port) : 80;
    }
    
    // In development, try to find the server port
    // First, check if we can read the port from localStorage (set by previous successful connections)
    const savedPort = localStorage.getItem('server_port');
    if (savedPort) {
      return parseInt(savedPort);
    }
    
    // Default to 8080 for the server in development
    return 8080;
  };

  // Get the base API URL
  const getApiUrl = () => {
    // In development, use a direct URL to the server
    if (process.env.NODE_ENV === 'development') {
      return `http://localhost:${getServerPort()}/api`;
    }
    
    // In production, use the current window location
    return `${window.location.protocol}//${window.location.host}/api`;
  };

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        // Try to get user data from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData) as User);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real app, this would be an API call
      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json() as ApiErrorResponse;
        throw new Error(errorData.message || 'Login failed');
      }
      
      const data = await response.json() as ApiAuthResponse;
      
      // Check if 2FA is required
      if (data.data && data.data.requireTwoFactor) {
        // Handle 2FA flow (not implemented in this example)
        setError('Two-factor authentication is required but not implemented in this demo');
        throw new Error('Two-factor authentication required');
      }
      
      // Save user data to localStorage
      localStorage.setItem('user', JSON.stringify(data.data.user));
      localStorage.setItem('token', data.data.accessToken);
      
      // Update state
      setUser(data.data.user);
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Login failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (username: string, firstName: string, lastName: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    // Validate password length before sending to server
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      throw new Error('Password must be at least 8 characters');
    }
    
    try {
      // In a real app, this would be an API call
      const apiUrl = getApiUrl();
      console.log('Making registration request to:', apiUrl);
      console.log('Registration data:', { 
        username, 
        email, 
        password,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`
      });
      
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username, 
          email, 
          password,
          firstName,
          lastName,
          displayName: `${firstName} ${lastName}`
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json() as ApiErrorResponse;
        throw new Error(errorData.message || 'Registration failed');
      }
      
      const data = await response.json() as ApiAuthResponse;
      
      // Check if the user needs email verification
      if (data.data.user && !data.data.user.isVerified) {
        // Set the verification email and show the verification modal
        setVerificationEmail(email);
        setShowVerificationModal(true);
      }
      
      // Save user data to localStorage
      localStorage.setItem('user', JSON.stringify(data.data.user));
      localStorage.setItem('token', data.data.accessToken);
      
      // Update state
      setUser(data.data.user);
    } catch (error) {
      console.error('Registration error:', error);
      setError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    // Remove user data from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Update state
    setUser(null);
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
    setVerificationEmail
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 