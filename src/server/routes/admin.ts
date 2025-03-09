import Router from 'express';
import type { Request, Response, NextFunction } from 'express';
import { User, Post, Comment } from '../models';
import { authenticate, authorize } from '../middleware/auth';
import { NotFoundError } from '../middleware/error';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { userRepository } from '../models/User';
import { postRepository } from '../models/Post';
import { commentRepository } from '../models/Comment';

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

// Create router using Router imported directly
const router = Router();

// All routes require authentication and admin role
router.use(authenticate, authorize('admin'));

// Get all users
router.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userRepository.findAll();
    const usersResponse = users.map(user => new User(user).toJSON());
    
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
      const { userId } = req.params;
      const { role } = req.body;
      
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      // Prevent changing own role (admin can't demote themselves)
      if (user.id === (req.user as any)?.id) {
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
      const { userId } = req.params;
      
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      // Prevent deleting own account
      if (user.id === (req.user as any)?.id) {
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
    const { userId, status } = req.query;
    
    const posts = await postRepository.find({ 
      limit: 50,
      filters: {
        ...(userId && { userId: userId as string }),
        ...(status && { status: status as string })
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
      const { postId } = req.params;
      
      const post = await Post.findByPk(postId);
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
      const { commentId } = req.params;
      
      const comment = await Comment.findByPk(commentId);
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

export const adminRouter = router;