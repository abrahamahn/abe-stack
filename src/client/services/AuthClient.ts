import { useCallback, useEffect, useMemo, useState } from "react";

// Remove unused import
// import { useClientEnvironment } from './ClientEnvironment';

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string | null;
  profileImage: string | null;
  emailConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

// API response types
interface ApiResponse<T> {
  status: "success" | "error";
  message?: string;
  data?: T;
  requireEmailConfirmation?: boolean;
}

interface UserResponse {
  user: User;
  token?: string;
  requireTwoFactor?: boolean;
  userId?: string;
}

export class AuthClient {
  // Get the server port
  private getServerPort(): number {
    // In production, use the same port as the client
    if (process.env.NODE_ENV === "production") {
      return window.location.port ? parseInt(window.location.port) : 80;
    }

    // In development, try to find the server port
    // First, check if we can read the port from localStorage (set by previous successful connections)
    const savedPort = localStorage.getItem("server_port");
    if (savedPort) {
      return parseInt(savedPort);
    }

    // Default to 8080 for the server in development
    return 8080;
  }

  // Get the base API URL
  getApiUrl() {
    // In development, use a direct URL to the server
    if (process.env.NODE_ENV === "development") {
      return `http://localhost:${this.getServerPort()}/api`;
    }

    // In production, use the current window location
    return `${window.location.protocol}//${window.location.host}/api`;
  }

  // Store token in localStorage
  setToken(token: string) {
    localStorage.setItem("auth_token", token);
  }

  getToken(): string | null {
    return localStorage.getItem("auth_token");
  }

  removeToken() {
    localStorage.removeItem("auth_token");
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Email verification methods
  async confirmEmail(token: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(
        `${this.getApiUrl()}/auth/confirm-email?token=${token}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      return (await response.json()) as Promise<{ success: boolean }>;
    } catch (error) {
      console.error("Error confirming email:", error);
      throw error;
    }
  }

  async resendConfirmationEmail(email: string) {
    try {
      const response = await fetch(
        `${this.getApiUrl()}/auth/resend-confirmation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        },
      );

      return (await response.json()) as Promise<{ success: boolean }>;
    } catch (error) {
      console.error("Error resending confirmation email:", error);
      throw error;
    }
  }
}

// Static instance for non-hook usage
export const authClientInstance = new AuthClient();

// React hook for authentication
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the authClient instance
  const authClient = useMemo(() => new AuthClient(), []);

  const loadUser = useCallback(async () => {
    if (!authClient.isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Use fetch directly to avoid API structure issues
      const token = authClient.getToken();
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = (await response.json()) as ApiResponse<UserResponse>;

      if (data.status === "success" && data.data?.user) {
        setUser(data.data.user);
      } else {
        // If we get a response but no user, token might be invalid
        authClient.removeToken();
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to load user:", err);
      // Clear token on auth error
      authClient.removeToken();
      setUser(null);
      setError("Failed to authenticate");
    } finally {
      setLoading(false);
    }
  }, [authClient]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as ApiResponse<UserResponse>;

      if (data.status === "success") {
        if (data.data?.requireTwoFactor) {
          // Return the 2FA requirement
          return { requireTwoFactor: true, userId: data.data.userId };
        }

        if (data.data?.token) {
          authClient.setToken(data.data.token);
        }
        if (data.data?.user) {
          setUser(data.data.user);
        }
        return { success: true };
      } else if (data.requireEmailConfirmation) {
        // Email not confirmed
        return {
          success: false,
          requireEmailConfirmation: true,
          email,
          error: data.message || "Email confirmation required",
        };
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
    firstName: string;
    lastName: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${authClient.getApiUrl()}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = (await response.json()) as ApiResponse<UserResponse>;

      if (data.status === "success" && data.data) {
        if (data.data.token) {
          authClient.setToken(data.data.token);
        }
        if (data.data.user) {
          setUser(data.data.user);
        }
        return {
          success: true,
          requireEmailConfirmation: !data.data.user.emailConfirmed,
          message: data.message || "Registration successful",
        };
      } else {
        throw new Error(data.message || "Registration failed");
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Registration failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authClient.removeToken();
    setUser(null);
  };

  // Load user on mount and when token changes
  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    refreshUser: loadUser,
    confirmEmail: authClient.confirmEmail.bind(authClient),
    resendConfirmationEmail:
      authClient.resendConfirmationEmail.bind(authClient),
  };
}
