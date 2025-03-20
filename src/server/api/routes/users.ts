// User API endpoints
export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  profileImage?: string;
  createdAt: string;
}

export interface GetUserRequest {
  id: string;
}

export interface GetUserResponse {
  user: User;
}

export interface UpdateUserRequest {
  id: string;
  displayName?: string;
  email?: string;
}

export interface UpdateUserResponse {
  success: boolean;
  user: User;
}

// Other user-related types can be added here
