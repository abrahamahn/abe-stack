import Router from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Comment, CommentLike, Post } from '../models';
import { AppError } from '../middleware/error';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get comments for a post
router.get('/post/:postId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { offset = 0, limit = 10 } = req.query;

    const comments = await Comment.findByPostId({
      postId: req.params.postId,
      parentId: null, // Only get top-level comments
      limit: Number(limit),
      offset: Number(offset)
    });

    // Check if current user liked each comment
    const likedComments = await Promise.all(
      comments.map(c => CommentLike.findByUserAndComment((req.user as any)?.id, c.id))
    );

    const likedCommentIds = new Set(
      likedComments.filter(like => like !== null).map(like => like!.commentId)
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
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postId, content, parentId } = req.body;

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

    const comment = await Comment.create({
      userId: (req.user as any)?.id,
      postId,
      content,
      parentId,
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
router.delete('/:commentId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);

    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    if (comment.userId !== (req.user as any)?.id) {
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
router.post('/:commentId/like', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    // Check if already liked
    const existingLike = await CommentLike.findByUserAndComment((req.user as any)?.id, comment.id);

    if (existingLike) {
      throw new AppError('Already liked this comment', 400);
    }

    // Create like
    await CommentLike.create({
      userId: (req.user as any)?.id,
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
router.delete('/:commentId/like', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    // Check if liked
    const like = await CommentLike.findByUserAndComment((req.user as any)?.id, comment.id);

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
router.get('/:commentId/replies', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const replies = await Comment.findReplies(req.params.commentId);

    // Check if current user liked each reply
    const likedReplies = await Promise.all(
      replies.map(r => CommentLike.findByUserAndComment((req.user as any)?.id, r.id))
    );

    const likedReplyIds = new Set(
      likedReplies.filter(like => like !== null).map(like => like!.commentId)
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