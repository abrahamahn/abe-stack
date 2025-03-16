import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { authenticate, authorize } from '../middleware/auth';
import { NotFoundError } from '../middleware/error';
import { validate } from '../middleware/validate';
import { commentRepository } from '../models/Comment';
import { postRepository } from '../models/Post';
import { userRepository } from '../models/User';

// Validation schemas
const userRoleSchema = z.object({
  role: z.enum(['user', 'moderator', 'admin'], {
    errorMap: () => ({ message: 'Role must be one of: user, moderator, admin' })
  })
});

const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format')
});

const postIdParamSchema = z.object({
  postId: z.string().uuid('Invalid post ID format')
});

const commentIdParamSchema = z.object({
  commentId: z.string().uuid('Invalid comment ID format')
});

// Create router using our typed router utility
const router: express.Router = express.Router();

// All routes require authentication and admin role
router.use(authenticate, authorize('admin'));

// Get all users
router.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userRepository.findAll();
    const usersResponse = users.map(user => {
      // Convert to unknown first, then to Record<string, unknown>
      const userData = user as unknown as Record<string, unknown>;
      return {
        ...userData,
        toJSON: () => userData
      };
    });
    
    res.json({
      status: 'success',
      data: { users: usersResponse }
    });
  } catch (error) {
    next(error);
  }
});

// Update user role
router.patch(
  '/users/:userId/role',
  validate(userIdParamSchema, 'params'),
  validate(userRoleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId  } = req.params as { userId: string };
      const { role  } = req.body as { role: string };
      
      // Use userRepository instead of User model directly
      const user = await userRepository.findById(userId) as unknown as { 
        id: string; 
        update: (data: Record<string, unknown>) => Promise<unknown>;
        toJSON: () => Record<string, unknown>;
      };
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      // Prevent changing own role (admin can't demote themselves)
      const reqUserId = (req.user as { id: string } | undefined)?.id;
      if (user.id === reqUserId) {
        throw new Error('Cannot change your own role');
      }
      
      await user.update({ role });
      
      res.json({
        status: 'success',
        data: { user: user.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete user
router.delete(
  '/users/:userId',
  validate(userIdParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId  } = req.params as { userId: string };
      
      // Use userRepository instead of User model directly
      const user = await userRepository.findById(userId) as unknown as { 
        id: string; 
        delete: () => Promise<unknown>;
      };
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      // Prevent deleting own account
      const reqUserId = (req.user as { id: string } | undefined)?.id;
      if (user.id === reqUserId) {
        throw new Error('Cannot delete your own account');
      }
      
      await user.delete();
      
      res.json({
        status: 'success',
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all posts (with filtering options)
router.get('/posts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, status  } = req.query as { userId: string, status: string };
    
    const posts = await postRepository.find({ 
      limit: 50,
      filters: {
        ...(userId && { userId }),
        ...(status && { status })
      }
    });
    
    res.json({
      status: 'success',
      data: { posts }
    });
  } catch (error) {
    next(error);
  }
});

// Delete post
router.delete(
  '/posts/:postId',
  validate(postIdParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postId  } = req.params as { postId: string };
      
      // Use postRepository instead of Post model directly
      const post = await postRepository.findById(postId) as unknown as { 
        id: string; 
        delete: () => Promise<unknown>;
      };
      if (!post) {
        throw new NotFoundError('Post not found');
      }
      
      await post.delete();
      
      res.json({
        status: 'success',
        message: 'Post deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete comment
router.delete(
  '/comments/:commentId',
  validate(commentIdParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId  } = req.params as { commentId: string };
      
      // Use commentRepository instead of Comment model directly
      const comment = await commentRepository.findById(commentId) as unknown as { 
        id: string; 
        delete: () => Promise<unknown>;
      };
      if (!comment) {
        throw new NotFoundError('Comment not found');
      }
      
      await comment.delete();
      
      res.json({
        status: 'success',
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get system stats
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const userCount = await userRepository.count();
    const postCount = await postRepository.count();
    const commentCount = await commentRepository.count();
    
    // Get user counts by role
    const usersByRole = await userRepository.countByRole();
    
    // Get posts created in the last 7 days
    const lastWeekPosts = await postRepository.countLastWeek();
    
    res.json({
      status: 'success',
      data: {
        userCount,
        postCount,
        commentCount,
        usersByRole,
        lastWeekPosts
      }
    });
  } catch (error) {
    next(error);
  }
});

// Export the router
export { router as adminRouter };