// Base API URL
const API_URL = "/api";

// Auth API response types
export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: any;
  accessToken?: string;
  requireMfa?: boolean;
  requireEmailVerification?: boolean;
}

// Auth API client
const authApi = {
  // Login function
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log("Attempting login with:", { email });

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.error || "Login failed",
        };
      }

      return {
        success: true,
        user: data.user,
        accessToken: data.accessToken,
        requireMfa: data.requireMfa,
        message: data.message,
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: "Unable to connect to server",
      };
    }
  },

  // Register function
  async register(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  }): Promise<AuthResponse> {
    try {
      console.log("Attempting registration with:", userData.email);

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.error || "Registration failed",
        };
      }

      return {
        success: true,
        user: data.user,
        accessToken: data.accessToken,
        requireEmailVerification: data.requireEmailVerification,
        message: data.message,
      };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: "Unable to connect to server",
      };
    }
  },

  // Logout function
  async logout(): Promise<AuthResponse> {
    try {
      console.log("Attempting logout");

      const response = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.error || "Logout failed",
        };
      }

      return {
        success: true,
        message: data.message || "Logged out successfully",
      };
    } catch (error) {
      console.error("Logout error:", error);
      return {
        success: false,
        message: "Logout failed",
      };
    }
  },

  // Refresh token function
  async refreshToken(): Promise<AuthResponse> {
    try {
      console.log("Attempting token refresh");

      const response = await fetch(`${API_URL}/auth/refresh-token`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.error || "Token refresh failed",
        };
      }

      return {
        success: true,
        accessToken: data.accessToken,
        message: data.message,
      };
    } catch (error) {
      console.error("Token refresh error:", error);
      return {
        success: false,
        message: "Token refresh failed",
      };
    }
  },

  // Get current user function
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      console.log("Getting current user");

      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.error || "Not authenticated",
        };
      }

      return {
        success: true,
        user: data,
      };
    } catch (error) {
      console.error("Get current user error:", error);
      return {
        success: false,
        message: "Not authenticated",
      };
    }
  },
};

export default authApi;
