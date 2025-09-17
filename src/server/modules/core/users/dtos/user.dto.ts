/**
 * User data transfer object
 */
export interface UserDto {
  /**
   * User ID
   */
  id: string;

  /**
   * Username
   */
  username: string;

  /**
   * Email address
   */
  email: string;

  /**
   * Display name
   */
  displayName?: string;

  /**
   * First name
   */
  firstName?: string;

  /**
   * Last name
   */
  lastName?: string;

  /**
   * User role
   */
  role: string;

  /**
   * Creation timestamp
   */
  createdAt: string;

  /**
   * Last update timestamp
   */
  updatedAt: string;

  /**
   * Whether the user is active
   */
  isActive: boolean;

  /**
   * Whether the email is verified
   */
  isEmailVerified: boolean;

  /**
   * Last login timestamp
   */
  lastLoginAt?: string;
}

/**
 * User profile data transfer object
 */
export interface UserProfileDto {
  /**
   * Profile ID
   */
  id: string;

  /**
   * User ID
   */
  userId: string;

  /**
   * Display name
   */
  displayName?: string;

  /**
   * Biography
   */
  bio?: string;

  /**
   * Location
   */
  location?: string;

  /**
   * Website
   */
  website?: string;

  /**
   * Company
   */
  company?: string;

  /**
   * Job title
   */
  jobTitle?: string;

  /**
   * Profile image URL
   */
  profileImage?: string;

  /**
   * Cover image URL
   */
  coverImage?: string;

  /**
   * Social media links
   */
  socialLinks?: {
    /**
     * Twitter URL
     */
    twitter?: string;

    /**
     * Facebook URL
     */
    facebook?: string;

    /**
     * Instagram URL
     */
    instagram?: string;

    /**
     * LinkedIn URL
     */
    linkedin?: string;

    /**
     * GitHub URL
     */
    github?: string;
  };

  /**
   * Creation timestamp
   */
  createdAt: string;

  /**
   * Last update timestamp
   */
  updatedAt: string;
}

/**
 * User preferences data transfer object
 */
export interface UserPreferencesDto {
  /**
   * Preferences ID
   */
  id: string;

  /**
   * User ID
   */
  userId: string;

  /**
   * UI theme
   */
  theme: string;

  /**
   * Language preference
   */
  language: string;

  /**
   * Timezone
   */
  timezone: string;

  /**
   * Notification preferences
   */
  notifications: {
    /**
     * Email notifications
     */
    email: boolean;

    /**
     * Push notifications
     */
    push: boolean;

    /**
     * SMS notifications
     */
    sms: boolean;

    /**
     * Marketing emails
     */
    emailMarketing: boolean;

    /**
     * Application updates
     */
    emailUpdates: boolean;

    /**
     * Security alerts
     */
    emailSecurity: boolean;
  };

  /**
   * Privacy settings
   */
  privacy: {
    /**
     * Profile visibility
     */
    profileVisibility: "public" | "private" | "connections";

    /**
     * Show email publicly
     */
    showEmail: boolean;

    /**
     * Show location publicly
     */
    showLocation: boolean;

    /**
     * Allow others to find user by email
     */
    allowSearchByEmail: boolean;

    /**
     * Allow others to find user by phone
     */
    allowSearchByPhone: boolean;
  };

  /**
   * Creation timestamp
   */
  createdAt: string;

  /**
   * Last update timestamp
   */
  updatedAt: string;
}

/**
 * User stats data transfer object
 */
export interface UserStatsDto {
  /**
   * User ID
   */
  userId: string;

  /**
   * Number of posts
   */
  postsCount: number;

  /**
   * Number of followers
   */
  followersCount: number;

  /**
   * Number of users being followed
   */
  followingCount: number;

  /**
   * Last activity timestamp
   */
  lastActive: string;

  /**
   * Registration timestamp
   */
  joinedAt: string;

  /**
   * Engagement rate
   */
  engagementRate: number;
}

/**
 * User filter parameters
 */
export interface UserFilterParams {
  /**
   * Filter by role
   */
  role?: string;

  /**
   * Filter by active status
   */
  isActive?: boolean;

  /**
   * Filter by email verification status
   */
  isEmailVerified?: boolean;

  /**
   * Filter by creation date (after)
   */
  createdAfter?: string;

  /**
   * Filter by creation date (before)
   */
  createdBefore?: string;

  /**
   * Search term
   */
  search?: string;

  /**
   * Order by field
   */
  orderBy?: "username" | "email" | "createdAt" | "lastLoginAt";

  /**
   * Sort order
   */
  order?: "asc" | "desc";

  /**
   * Page number
   */
  page?: number;

  /**
   * Results per page
   */
  limit?: number;
}

/**
 * Get users response data transfer object
 */
export interface GetUsersResponseDto {
  /**
   * List of users
   */
  users: UserDto[];

  /**
   * Total number of users
   */
  total: number;

  /**
   * Current page
   */
  page: number;

  /**
   * Results per page
   */
  limit: number;

  /**
   * Total number of pages
   */
  totalPages: number;
}

/**
 * Update user request data transfer object
 */
export interface UpdateUserRequestDto {
  /**
   * Username
   */
  username?: string;

  /**
   * Email address
   */
  email?: string;

  /**
   * First name
   */
  firstName?: string;

  /**
   * Last name
   */
  lastName?: string;

  /**
   * Active status
   */
  isActive?: boolean;
}

/**
 * Update user response data transfer object
 */
export interface UpdateUserResponseDto {
  /**
   * Whether the update was successful
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;

  /**
   * Updated user data
   */
  user: UserDto;
}

/**
 * Update user role request data transfer object
 */
export interface UpdateUserRoleRequestDto {
  /**
   * New role
   */
  role: string;
}

/**
 * Update user role response data transfer object
 */
export interface UpdateUserRoleResponseDto {
  /**
   * Whether the update was successful
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;
}

/**
 * Update password request data transfer object
 */
export interface UpdatePasswordRequestDto {
  /**
   * Current password
   */
  currentPassword: string;

  /**
   * New password
   */
  newPassword: string;

  /**
   * Confirm new password
   */
  confirmPassword: string;
}

/**
 * Update password response data transfer object
 */
export interface UpdatePasswordResponseDto {
  /**
   * Whether the update was successful
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;
}

/**
 * Update profile request data transfer object
 */
export interface UpdateProfileRequestDto {
  /**
   * Display name
   */
  displayName?: string;

  /**
   * Biography
   */
  bio?: string;

  /**
   * Location
   */
  location?: string;

  /**
   * Website
   */
  website?: string;

  /**
   * Company
   */
  company?: string;

  /**
   * Job title
   */
  jobTitle?: string;

  /**
   * Social media links
   */
  socialLinks?: {
    /**
     * Twitter URL
     */
    twitter?: string;

    /**
     * Facebook URL
     */
    facebook?: string;

    /**
     * Instagram URL
     */
    instagram?: string;

    /**
     * LinkedIn URL
     */
    linkedin?: string;

    /**
     * GitHub URL
     */
    github?: string;
  };
}

/**
 * Update profile response data transfer object
 */
export interface UpdateProfileResponseDto {
  /**
   * Whether the update was successful
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;

  /**
   * Updated profile data
   */
  profile: UserProfileDto;
}

/**
 * Profile completion data transfer object
 */
export interface ProfileCompletionDto {
  /**
   * User ID
   */
  userId: string;

  /**
   * Profile completion percentage
   */
  completionPercentage: number;

  /**
   * Completed profile sections
   */
  completedSections: string[];

  /**
   * Missing profile sections
   */
  missingSections: string[];

  /**
   * Suggestions for improvement
   */
  suggestions: string[];
}

/**
 * Update profile image response data transfer object
 */
export interface UpdateProfileImageResponseDto {
  /**
   * Whether the update was successful
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;

  /**
   * Image URL
   */
  imageUrl: string;
}

/**
 * User search parameters
 */
export interface UserSearchParams {
  /**
   * Search query
   */
  query: string;

  /**
   * Filter by location
   */
  location?: string;

  /**
   * Filter by skills
   */
  skills?: string[];

  /**
   * Page number
   */
  page?: number;

  /**
   * Results per page
   */
  limit?: number;
}

/**
 * Update preferences response data transfer object
 */
export interface UpdatePreferencesResponseDto {
  /**
   * Whether the update was successful
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;

  /**
   * Updated preferences data
   */
  preferences: UserPreferencesDto;
}

/**
 * Update notification preferences request data transfer object
 */
export interface UpdateNotificationPreferencesRequestDto {
  /**
   * Email notifications
   */
  email?: boolean;

  /**
   * Push notifications
   */
  push?: boolean;

  /**
   * SMS notifications
   */
  sms?: boolean;

  /**
   * Marketing emails
   */
  emailMarketing?: boolean;

  /**
   * Application updates
   */
  emailUpdates?: boolean;

  /**
   * Security alerts
   */
  emailSecurity?: boolean;
}

/**
 * Update privacy preferences request data transfer object
 */
export interface UpdatePrivacyPreferencesRequestDto {
  /**
   * Profile visibility
   */
  profileVisibility?: "public" | "private" | "connections";

  /**
   * Show email publicly
   */
  showEmail?: boolean;

  /**
   * Show location publicly
   */
  showLocation?: boolean;

  /**
   * Allow others to find user by email
   */
  allowSearchByEmail?: boolean;

  /**
   * Allow others to find user by phone
   */
  allowSearchByPhone?: boolean;
}

/**
 * Reset preferences response data transfer object
 */
export interface ResetPreferencesResponseDto {
  /**
   * Whether the reset was successful
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;

  /**
   * Reset preferences data
   */
  preferences: UserPreferencesDto;
}
