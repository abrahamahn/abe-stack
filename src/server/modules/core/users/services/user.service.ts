/**
 * User data interface
 */
export interface User {
  id: string;
  email: string;
  username?: string;
  password?: string; // Hashed password
  firstName?: string;
  lastName?: string;
  displayName?: string;
  roles: string[];
  apiKeys?: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  emailConfirmed?: boolean;
  [key: string]: any;
}

// Mock users for demonstration
const mockUsers: User[] = [
  {
    id: "user-123",
    email: "user@example.com",
    username: "regularuser",
    firstName: "Regular",
    lastName: "User",
    displayName: "Regular User",
    password: "hashed-password-123", // In real app, this would be hashed
    roles: ["user"],
    apiKeys: [],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
    mfaEnabled: false,
    emailConfirmed: true,
  },
  {
    id: "admin-456",
    email: "admin@example.com",
    username: "adminuser",
    firstName: "Admin",
    lastName: "User",
    displayName: "Admin User",
    password: "hashed-password-456", // In real app, this would be hashed
    roles: ["user", "admin"],
    apiKeys: [],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
    mfaEnabled: true,
    emailConfirmed: true,
  },
  {
    id: "api-789",
    email: "api@example.com",
    username: "apiuser",
    displayName: "API User",
    roles: ["api"],
    apiKeys: ["test-api-key-123"],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
    mfaEnabled: false,
    emailConfirmed: true,
  },
];

/**
 * Find a user by their ID
 */
export async function findUserById(id: string): Promise<User | null> {
  const user = mockUsers.find((u) => u.id === id);
  return user || null;
}

/**
 * Find a user by their email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const user = mockUsers.find((u) => u.email === email);
  return user || null;
}

/**
 * Find a user by their username
 */
export async function findUserByUsername(
  username: string
): Promise<User | null> {
  const user = mockUsers.find((u) => u.username === username);
  return user || null;
}

/**
 * Find a user by username/email and password (for basic auth)
 */
export async function findUserByCredentials(
  usernameOrEmail: string,
  password: string
): Promise<User | null> {
  // In a real app, you would hash the password and compare with stored hash
  const user = mockUsers.find(
    (u) =>
      (u.username === usernameOrEmail || u.email === usernameOrEmail) &&
      u.password === password
  );
  return user || null;
}

/**
 * Find a user by API key
 */
export async function findUserByApiKey(apiKey: string): Promise<User | null> {
  const user = mockUsers.find((u) => u.apiKeys?.includes(apiKey));
  return user || null;
}

/**
 * Create a new user
 */
export async function createUser(userData: Partial<User>): Promise<User> {
  // Validate required fields
  if (!userData.email) {
    throw new Error("Email is required");
  }

  // Check if user already exists
  const existingUser = await findUserByEmail(userData.email);
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Create new user
  const newUser: User = {
    id: `user-${Date.now()}`, // Generate a unique ID
    email: userData.email,
    username: userData.username,
    firstName: userData.firstName,
    lastName: userData.lastName,
    displayName:
      userData.displayName ||
      `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
      userData.username,
    password: userData.password, // In real app, would hash this
    roles: userData.roles || ["user"], // Default role
    apiKeys: userData.apiKeys || [],
    active: userData.active !== undefined ? userData.active : true,
    createdAt: new Date(),
    updatedAt: new Date(),
    mfaEnabled: userData.mfaEnabled || false,
    emailConfirmed: userData.emailConfirmed || false,
    ...userData,
  };

  // In a real app, would save to database
  mockUsers.push(newUser);

  return newUser;
}

/**
 * Update an existing user
 */
export async function updateUser(
  id: string,
  updates: Partial<User>
): Promise<User | null> {
  const userIndex = mockUsers.findIndex((u) => u.id === id);
  if (userIndex === -1) {
    return null;
  }

  // Update user
  const updatedUser = {
    ...mockUsers[userIndex],
    ...updates,
    updatedAt: new Date(),
  };

  mockUsers[userIndex] = updatedUser;

  return updatedUser;
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<boolean> {
  const userIndex = mockUsers.findIndex((u) => u.id === id);
  if (userIndex === -1) {
    return false;
  }

  mockUsers.splice(userIndex, 1);
  return true;
}
