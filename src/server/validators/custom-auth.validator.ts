import * as t from '../../shared/dataTypes';

// Helper for string validation with min/max length and regex
const createStringValidator = (
  minLength?: number,
  maxLength?: number,
  pattern?: RegExp,
  patternMessage?: string,
  isEmail?: boolean,
  isUrl?: boolean
) => {
  let validator = t.string();
  
  // Create a custom validator with all the constraints
  return t.custom<string>((value) => {
    if (typeof value !== 'string') {
      throw new Error('Value must be a string');
    }
    
    if (minLength !== undefined && value.length < minLength) {
      throw new Error(`Must be at least ${minLength} characters`);
    }
    
    if (maxLength !== undefined && value.length > maxLength) {
      throw new Error(`Cannot exceed ${maxLength} characters`);
    }
    
    if (pattern !== undefined && !pattern.test(value)) {
      throw new Error(patternMessage || 'Invalid format');
    }
    
    if (isEmail) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(value)) {
        throw new Error('Invalid email address');
      }
    }
    
    if (isUrl) {
      try {
        new URL(value);
      } catch {
        throw new Error('Invalid URL');
      }
    }
    
    return true;
  });
};

// Register validation schema
export const registerSchema = t.object({
  username: createStringValidator(
    3, 
    30, 
    /^[a-zA-Z0-9_]+$/, 
    'Username can only contain letters, numbers, and underscores'
  ),
  email: createStringValidator(undefined, undefined, undefined, undefined, true),
  password: createStringValidator(
    8, 
    undefined, 
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/, 
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  ),
  displayName: createStringValidator(2, 50)
});

// Login validation schema
export const loginSchema = t.object({
  email: createStringValidator(undefined, undefined, undefined, undefined, true),
  password: createStringValidator(1)
});

// Refresh token validation schema
export const refreshTokenSchema = t.object({
  refreshToken: createStringValidator(1)
});

// Update profile validation schema
export const updateProfileSchema = t.object({
  displayName: t.optional(createStringValidator(2, 50)),
  bio: t.optional(createStringValidator(undefined, 500)),
  avatar: t.optional(createStringValidator(undefined, undefined, undefined, undefined, false, true))
});

// Change password validation schema
export const changePasswordSchema = t.object({
  currentPassword: createStringValidator(1),
  newPassword: createStringValidator(
    8, 
    undefined, 
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/, 
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  )
});

// UUID validator helper
const uuidValidator = t.custom<string>((value) => {
  if (typeof value !== 'string') {
    throw new Error('Value must be a string');
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new Error('Invalid UUID format');
  }
  
  return true;
});

// Two-factor authentication verification schema
export const twoFactorVerifySchema = t.object({
  userId: uuidValidator,
  token: createStringValidator(6, 10)
});

// Two-factor authentication enable schema
export const twoFactorEnableSchema = t.object({
  token: createStringValidator(6, 10)
});

export const customAuthValidator = t.type({
  // Add your custom auth validation fields here
  username: t.string,
  password: t.string,
  // Add any additional fields as needed
}); 