import { Router } from 'express';
import { User, Post, Comment } from '../models';
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
router.get('/reports', async (req, res, next) => {
  try {
    // Get reported posts
    const posts = await Post.findAll({
      where: {
        status: 'flagged'
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'displayName', 'avatar']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    // Get reported comments
    const comments = await Comment.findAll({
      where: {
        status: 'flagged'
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'displayName', 'avatar']
        },
        {
          model: Post,
          attributes: ['id', 'content']
        }
      ],
      order: [['updatedAt', 'DESC']]
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
  async (req, res, next) => {
    try {
      const { postId } = req.params;
      const { status, reason } = req.body;
      
      const post = await Post.findByPk(postId);
      if (!post) {
        throw new NotFoundError('Post not found');
      }
      
      // Update post status
      post.status = status;
      post.moderationReason = reason;
      post.moderatedBy = req.user!.id;
      post.moderatedAt = new Date();
      
      await post.save();
      
      res.json({
        status: 'success',
        data: { post }
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
  async (req, res, next) => {
    try {
      const { commentId } = req.params;
      const { status, reason } = req.body;
      
      const comment = await Comment.findByPk(commentId);
      if (!comment) {
        throw new NotFoundError('Comment not found');
      }
      
      // Update comment status
      comment.status = status;
      comment.moderationReason = reason;
      comment.moderatedBy = req.user!.id;
      comment.moderatedAt = new Date();
      
      await comment.save();
      
      res.json({
        status: 'success',
        data: { comment }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get moderation history
router.get('/history', async (req, res, next) => {
  try {
    // Get moderated posts
    const posts = await Post.findAll({
      where: {
        moderatedBy: { [Op.ne]: null }
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'displayName', 'avatar']
        },
        {
          model: User,
          as: 'moderator',
          attributes: ['id', 'username', 'displayName']
        }
      ],
      order: [['moderatedAt', 'DESC']],
      limit: 50
    });
    
    // Get moderated comments
    const comments = await Comment.findAll({
      where: {
        moderatedBy: { [Op.ne]: null }
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'displayName', 'avatar']
        },
        {
          model: User,
          as: 'moderator',
          attributes: ['id', 'username', 'displayName']
        },
        {
          model: Post,
          attributes: ['id', 'content']
        }
      ],
      order: [['moderatedAt', 'DESC']],
      limit: 50
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