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

// Enum validator helper
const createEnumValidator = <T extends string>(allowedValues: T[]) => {
  return t.custom<T>((value) => {
    if (typeof value !== 'string') {
      throw new Error('Value must be a string');
    }
    
    if (!allowedValues.includes(value as T)) {
      throw new Error(`Value must be one of: ${allowedValues.join(', ')}`);
    }
    
    return true;
  });
};

// Media type validator
const mediaTypeValidator = createEnumValidator(['image', 'video', 'audio']);

// Post creation schema
export const createPostSchema = t.object({
  content: createStringValidator(1, 2000, undefined, 'Post content is required'),
  media: t.optional(t.object({
    type: mediaTypeValidator,
    url: createStringValidator(undefined, undefined, undefined, undefined, false, true),
    thumbnail: t.optional(createStringValidator(undefined, undefined, undefined, undefined, false, true))
  }))
});

// Post ID param schema
export const postIdParamSchema = t.object({
  postId: uuidValidator
});

// Comment creation schema
export const createCommentSchema = t.object({
  content: createStringValidator(1, 1000, undefined, 'Comment content is required')
});

// Comment ID param schema
export const commentIdParamSchema = t.object({
  commentId: uuidValidator
});

// Reply to comment schema
export const replyToCommentSchema = t.object({
  content: createStringValidator(1, 1000, undefined, 'Reply content is required')
});

// User ID param schema
export const userIdParamSchema = t.object({
  userId: uuidValidator
});

// Number string validator
const numberStringValidator = createStringValidator(
  undefined, 
  undefined, 
  /^\d+$/, 
  'Must be a number'
);

// Feed query schema
export const feedQuerySchema = t.object({
  offset: t.optional(numberStringValidator),
  limit: t.optional(numberStringValidator)
});

// Get comments query schema
export const getCommentsQuerySchema = t.object({
  offset: t.optional(numberStringValidator),
  limit: t.optional(numberStringValidator)
}); 