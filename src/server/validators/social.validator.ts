import { z } from 'zod';

// Post creation schema
export const createPostSchema = z.object({
  content: z.string()
    .min(1, 'Post content is required')
    .max(2000, 'Post content cannot exceed 2000 characters'),
  media: z.object({
    type: z.enum(['image', 'video', 'audio']),
    url: z.string().url('Media URL must be a valid URL'),
    thumbnail: z.string().url('Thumbnail URL must be a valid URL').optional(),
  }).optional(),
});

// Post ID param schema
export const postIdParamSchema = z.object({
  postId: z.string().uuid('Invalid post ID format'),
});

// Comment creation schema
export const createCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment content is required')
    .max(1000, 'Comment content cannot exceed 1000 characters'),
});

// Comment ID param schema
export const commentIdParamSchema = z.object({
  commentId: z.string().uuid('Invalid comment ID format'),
});

// Reply to comment schema
export const replyToCommentSchema = z.object({
  content: z.string()
    .min(1, 'Reply content is required')
    .max(1000, 'Reply content cannot exceed 1000 characters'),
});

// User ID param schema
export const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

// Feed query schema
export const feedQuerySchema = z.object({
  offset: z.string().regex(/^\d+$/, 'Offset must be a number').optional(),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
});

// Get comments query schema
export const getCommentsQuerySchema = z.object({
  offset: z.string().regex(/^\d+$/, 'Offset must be a number').optional(),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
}); 