import express from 'express';
import type { Request, Response, NextFunction } from 'express';

import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { Comment, CommentLike, Post } from '../models';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
  params: {
    postId?: string;
    commentId?: string;
  };
}

const router: express.Router = express.Router();

// Get comments for a post
router.get('/post/:postId', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { offset = 0, limit = 10 } = req.query as { offset?: number; limit?: number };
    const postId = req.params.postId as string;

    const comments = await Comment.findByPostId({
      postId,
      parentId: null, // Only get top-level comments
      limit: Number(limit),
      offset: Number(offset)
    });

    // Check if current user liked each comment
    if (!req.user) {
      // If user is not authenticated, return comments without like status
      res.json({
        status: 'success',
        data: { comments }
      });
      return;
    }

    const userId = req.user.id;
    const likedComments = await Promise.all(
      comments.map(c => CommentLike.findByUserAndComment(userId, c.id))
    );

    const likedCommentIds = new Set(
      likedComments.filter((like: CommentLike | null) => like !== null).map((like: CommentLike) => like.commentId)
    );

    const commentsWithLikes = comments.map(comment => {
      const commentData = comment.toJSON();
      commentData.isLiked = likedCommentIds.has(comment.id);
      return commentData;
    });

    res.json({
      status: 'success',
      data: { comments: commentsWithLikes }
    });
  } catch (error) {
    next(error);
  }
});

// Create comment
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { postId, content, parentId } = req.body as { postId: string; content: string; parentId?: string };

    // Check if post exists
    const post = await Post.findByPk(postId);
    if (!post) {
      throw new AppError('Post not found', 404);
    }

    // If this is a reply, check if parent comment exists
    if (parentId) {
      const parentComment = await Comment.findByPk(parentId);
      if (!parentComment) {
        throw new AppError('Parent comment not found', 404);
      }
    }

    if (!req.user || !req.user.id) {
      throw new AppError('User not authenticated', 401);
    }

    const comment = await Comment.create({
      userId: req.user.id,
      postId,
      content,
      parentId: parentId || null,
      likesCount: 0,
      status: 'active',
      moderationReason: null,
      moderatedBy: null,
      moderatedAt: null
    });

    // Increment comments count on post
    await post.incrementComments();

    const commentWithUser = await Comment.findByPk(comment.id);

    res.status(201).json({
      status: 'success',
      data: { comment: commentWithUser }
    });
  } catch (error) {
    next(error);
  }
});

// Delete comment
router.delete('/:commentId', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.commentId as string;
    const comment = await Comment.findByPk(commentId);

    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    if (!req.user || !req.user.id) {
      throw new AppError('User not authenticated', 401);
    }

    if (comment.userId !== req.user.id) {
      throw new AppError('Not authorized to delete this comment', 403);
    }

    // Get post to decrement comments count
    const post = await Post.findByPk(comment.postId);
    if (post) {
      await post.decrementComments();
    }

    await comment.delete();

    res.json({
      status: 'success',
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Like comment
router.post('/:commentId/like', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.commentId as string;
    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    // Check if already liked
    if (!req.user || !req.user.id) {
      throw new AppError('User not authenticated', 401);
    }
    const existingLike = await CommentLike.findByUserAndComment(req.user.id, comment.id);

    if (existingLike) {
      throw new AppError('Already liked this comment', 400);
    }

    // Create like
    await CommentLike.create({
      userId: req.user.id,
      commentId: comment.id,
      updatedAt: new Date()
    });

    // Increment likes count
    await comment.incrementLikes();

    res.json({
      status: 'success',
      message: 'Comment liked successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Unlike comment
router.delete('/:commentId/like', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.commentId as string;
    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    // Check if liked
    if (!req.user || !req.user.id) {
      throw new AppError('User not authenticated', 401);
    }
    const like = await CommentLike.findByUserAndComment(req.user.id, comment.id);

    if (!like) {
      throw new AppError('Not liked this comment', 400);
    }

    // Remove like
    await like.delete();

    // Decrement likes count
    await comment.decrementLikes();

    res.json({
      status: 'success',
      message: 'Comment unliked successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get replies for a comment
router.get('/:commentId/replies', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.commentId as string;
    const replies = await Comment.findReplies(commentId);

    // Check if current user liked each reply
    if (!req.user || !req.user.id) {
      // If user is not authenticated, return replies without like status
      res.json({
        status: 'success',
        data: { replies }
      });
      return;
    }

    const likedReplies = await Promise.all(
      replies.map(r => CommentLike.findByUserAndComment(req.user?.id as string, r.id))
    );

    const likedReplyIds = new Set(
      likedReplies.filter(like => like !== null).map(like => like.commentId)
    );

    const repliesWithLikes = replies.map(reply => {
      const replyData = reply.toJSON();
      replyData.isLiked = likedReplyIds.has(reply.id);
      return replyData;
    });

    res.json({
      status: 'success',
      data: { replies: repliesWithLikes }
    });
  } catch (error) {
    next(error);
  }
});

export const commentRouter = router; 