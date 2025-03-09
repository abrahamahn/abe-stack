import { Router } from 'express';
import { Comment, User, CommentLike, Post } from '../models';
import { AppError } from '../middleware/error';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get comments for a post
router.get('/post/:postId', authenticate, async (req, res, next) => {
  try {
    const { offset = 0, limit = 10 } = req.query;

    const comments = await Comment.findByPostId(req.params.postId, {
      parentId: null, // Only get top-level comments
      limit: Number(limit),
      offset: Number(offset)
    });

    // Check if current user liked each comment
    const likedComments = await CommentLike.findByUserAndComments(
      req.user!.id,
      comments.map(c => c.id)
    );

    const likedCommentIds = new Set(likedComments.map(l => l.commentId));

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
router.post('/', authenticate, async (req, res, next) => {
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
      userId: req.user!.id,
      postId,
      content,
      parentId,
      likesCount: 0
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
router.delete('/:commentId', authenticate, async (req, res, next) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);

    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    if (comment.userId !== req.user!.id) {
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
router.post('/:commentId/like', authenticate, async (req, res, next) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    // Check if already liked
    const existingLike = await CommentLike.findByUserAndComment(req.user!.id, comment.id);

    if (existingLike) {
      throw new AppError('Already liked this comment', 400);
    }

    // Create like
    await CommentLike.create({
      userId: req.user!.id,
      commentId: comment.id
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
router.delete('/:commentId/like', authenticate, async (req, res, next) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    // Check if liked
    const like = await CommentLike.findByUserAndComment(req.user!.id, comment.id);

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
router.get('/:commentId/replies', authenticate, async (req, res, next) => {
  try {
    const { offset = 0, limit = 10 } = req.query;

    const replies = await Comment.findByParentId(req.params.commentId, {
      limit: Number(limit),
      offset: Number(offset)
    });

    // Check if current user liked each reply
    const likedReplies = await CommentLike.findByUserAndComments(
      req.user!.id,
      replies.map(r => r.id)
    );

    const likedReplyIds = new Set(likedReplies.map(l => l.commentId));

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