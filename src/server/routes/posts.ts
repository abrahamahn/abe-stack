import Router from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Post, Like, Follow } from '../models';
import { AppError } from '../middleware/error';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get feed
router.get('/feed', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { offset = 0, limit = 10 } = req.query;

    // Get users that the current user follows
    const following = await Follow.findFollowing((req.user as any)?.id);
    const followingIds = following.map(f => f.followingId);

    // Get posts from followed users and current user
    const posts = await Post.findByUserIds([...followingIds, (req.user as any)?.id], {
      limit: Number(limit),
      offset: Number(offset)
    });

    // Check if current user liked each post
    const likedPosts = await Like.findByUserAndPosts((req.user as any)?.id, posts.map(p => p.id));
    const likedPostIds = new Set(likedPosts.map(l => l.postId));

    const postsWithLikes = posts.map(post => {
      const postData = post.toJSON();
      postData.isLiked = likedPostIds.has(post.id);
      return postData;
    });

    res.json({
      status: 'success',
      data: { posts: postsWithLikes }
    });
  } catch (error) {
    next(error);
  }
});

// Create post
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, media } = req.body;

    const post = await Post.create({
      userId: (req.user as any)?.id,
      content,
      media,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      status: 'active',
      moderationReason: null,
      moderatedBy: null,
      moderatedAt: null
    });

    const postWithUser = await Post.findByPk(post.id);

    res.status(201).json({
      status: 'success',
      data: { post: postWithUser }
    });
  } catch (error) {
    next(error);
  }
});

// Get post
router.get('/:postId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findByPk(req.params.postId);

    if (!post) {
      throw new AppError('Post not found', 404);
    }

    // Check if current user liked the post
    const like = await Like.findByUserAndPost((req.user as any)?.id, post.id);

    const postData = post.toJSON();
    postData.isLiked = !!like;

    res.json({
      status: 'success',
      data: { post: postData }
    });
  } catch (error) {
    next(error);
  }
});

// Delete post
router.delete('/:postId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findByPk(req.params.postId);

    if (!post) {
      throw new AppError('Post not found', 404);
    }

    if (post.userId !== (req.user as any)?.id) {
      throw new AppError('Not authorized to delete this post', 403);
    }

    await post.delete();

    res.json({
      status: 'success',
      message: 'Post deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Like post
router.post('/:postId/like', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findByPk(req.params.postId);
    if (!post) {
      throw new AppError('Post not found', 404);
    }

    // Check if already liked
    const existingLike = await Like.findByUserAndPost((req.user as any)?.id, post.id);

    if (existingLike) {
      throw new AppError('Already liked this post', 400);
    }

    // Create like
    await Like.create({
      userId: (req.user as any)?.id,
      postId: post.id,
      updatedAt: new Date()
    });

    // Increment likes count
    await post.incrementLikes();

    res.json({
      status: 'success',
      message: 'Post liked successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Unlike post
router.delete('/:postId/like', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findByPk(req.params.postId);
    if (!post) {
      throw new AppError('Post not found', 404);
    }

    // Check if liked
    const like = await Like.findByUserAndPost((req.user as any)?.id, post.id);

    if (!like) {
      throw new AppError('Not liked this post', 400);
    }

    // Remove like
    await like.delete();

    // Decrement likes count
    await post.decrementLikes();

    res.json({
      status: 'success',
      message: 'Post unliked successfully'
    });
  } catch (error) {
    next(error);
  }
});

export const postRouter = router; 