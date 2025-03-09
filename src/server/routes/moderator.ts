import Router from 'express';
import type { Request, Response, NextFunction } from 'express';
import { User, Post, Comment } from '../models';
import { postRepository } from '../models/Post';
import { commentRepository } from '../models/Comment';
import { authenticate, authorize } from '../middleware/auth';
import { NotFoundError } from '../middleware/error';
import { validate } from '../middleware/validate';
import { z } from 'zod';

// Validation schemas
const postIdParamSchema = z.object({
  postId: z.string().uuid('Invalid post ID format')
});

const commentIdParamSchema = z.object({
  commentId: z.string().uuid('Invalid comment ID format')
});

const contentStatusSchema = z.object({
  status: z.enum(['active', 'hidden', 'flagged'], {
    errorMap: () => ({ message: 'Status must be one of: active, hidden, flagged' })
  }),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason cannot exceed 500 characters')
});

const router = Router();

// All routes require authentication and moderator or admin role
router.use(authenticate, authorize('moderator', 'admin'));

// Get reported content
router.get('/reports', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Get reported posts
    const posts = await postRepository.findAll({
      status: 'flagged'
    });
    
    // Get reported comments
    const comments = await commentRepository.findAll({
      status: 'flagged'
    });
    
    res.json({
      status: 'success',
      data: {
        posts,
        comments
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update post status (hide/show/flag)
router.patch(
  '/posts/:postId/status',
  validate(postIdParamSchema, 'params'),
  validate(contentStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postId } = req.params;
      const { status, reason } = req.body;
      
      const post = await Post.findByPk(postId);
      if (!post) {
        throw new NotFoundError('Post not found');
      }
      
      // Update post status
      const updatedPost = await postRepository.update(postId, {
        status,
        moderationReason: reason,
        moderatedBy: req.user!.id,
        moderatedAt: new Date()
      });
      
      res.json({
        status: 'success',
        data: { post: updatedPost }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update comment status (hide/show/flag)
router.patch(
  '/comments/:commentId/status',
  validate(commentIdParamSchema, 'params'),
  validate(contentStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId } = req.params;
      const { status, reason } = req.body;
      
      const comment = await Comment.findByPk(commentId);
      if (!comment) {
        throw new NotFoundError('Comment not found');
      }
      
      // Update comment status
      const updatedComment = await commentRepository.update(commentId, {
        status,
        moderationReason: reason,
        moderatedBy: req.user!.id,
        moderatedAt: new Date()
      });
      
      res.json({
        status: 'success',
        data: { comment: updatedComment }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get moderation history
router.get('/history', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Get moderated posts
    const posts = await postRepository.findAll({
      status: 'hidden'
    });
    
    // Get moderated comments
    const comments = await commentRepository.findAll({
      status: 'hidden'
    });
    
    res.json({
      status: 'success',
      data: {
        posts,
        comments
      }
    });
  } catch (error) {
    next(error);
  }
});

export const moderatorRouter = router; 