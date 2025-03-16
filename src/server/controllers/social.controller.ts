import { Request, Response } from 'express';

import { uploadToStorage } from '../lib/storage';
import { Post, Comment, Like, CommentLike, Follow, User } from '../models';
import { UserJSON } from '../models/User';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
  params: {
    userId?: string;
    postId?: string;
    commentId?: string;
  };
  body: {
    content?: string;
  };
  query: {
    cursor?: string;
  };
  file?: Express.Multer.File;
}

// User Profile
export const getUserProfileHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }
    const currentUserId = req.user?.id;

    // Get user with followers
    const user = await User.findWithFollowers(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if current user is following this user
    let isFollowing = false;
    if (currentUserId) {
      const follow = await Follow.findByFollowerAndFollowing(currentUserId, userId);
      isFollowing = !!follow;
    }

    // Get counts
    const [followers, following, posts] = await Promise.all([
      Follow.findFollowers(userId),
      Follow.findFollowing(userId),
      Post.findByUserId(userId)
    ]);

    const followersCount = followers.length;
    const followingCount = following.length;
    const postsCount = posts.length;

    // Convert to safe user data
    const userData = {
      ...user,
      followers: undefined
    } as UserJSON;

    res.json({
      ...userData,
      isFollowing,
      followersCount,
      followingCount,
      postsCount
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

// Helper function for other parts of the application
export async function getUserProfile(userId: string, currentUserId?: string): Promise<UserJSON> {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Get user data without sensitive information
  const userData = {
    ...user,
    password: undefined,
    emailToken: undefined,
    emailTokenExpire: undefined
  } as UserJSON;
  
  // Check if current user is following this user
  let isFollowing = false;
  if (currentUserId) {
    const follow = await Follow.findByFollowerAndFollowing(currentUserId, userId);
    isFollowing = !!follow;
  }
  
  // Add isFollowing flag to the response
  return {
    ...userData,
    isFollowing
  };
}

// Follow/Unfollow
export const followUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const followerId = req.user?.id;

    if (!userId || !followerId) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (followerId === userId) {
      res.status(400).json({ error: 'Cannot follow yourself' });
      return;
    }

    // Check if already following
    const existingFollow = await Follow.findByFollowerAndFollowing(followerId, userId);
    if (existingFollow) {
      res.status(400).json({ error: 'Already following this user' });
      return;
    }

    await Follow.create({
      followerId,
      followingId: userId
    });

    res.status(200).json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
};

export const unfollowUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const followerId = req.user?.id;

    if (!userId || !followerId) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const follow = await Follow.findByFollowerAndFollowing(followerId, userId);
    if (!follow) {
      res.status(404).json({ error: 'Follow relationship not found' });
      return;
    }

    await follow.delete();
    res.status(200).json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
};

// Feed
export const getFeed = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const limit = 10;

    // Get following users first
    const following = await Follow.findFollowing(userId || '');
    const followingIds = following.map(f => f.followingId);

    // Get posts from followed users
    const posts = await Post.findByUserIds(followingIds, {
      limit: limit + 1
    });

    const hasMore = posts.length > limit;
    const formattedPosts = await Promise.all(
      posts.slice(0, limit).map(async post => {
        const user = await User.findById(post.userId);
        const isLiked = userId ? await Like.findByUserAndPost(userId, post.id) : false;

        return {
          id: post.id,
          userId: post.userId,
          username: user?.username || 'Unknown User',
          userAvatar: user?.profileImage,
          content: post.content,
          media: post.media,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          sharesCount: post.sharesCount,
          isLiked: !!isLiked,
          createdAt: post.createdAt.toISOString()
        };
      })
    );

    res.json({
      posts: formattedPosts,
      hasMore,
      nextCursor: hasMore && posts.length > 0 ? posts[posts.length - 1].createdAt.toISOString() : null
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
};

// Posts
export const createPost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    let media: string[] = [];

    // Handle file upload if present
    if (req.file) {
      const url = await uploadToStorage(req.file);
      media = [url];
    }

    const post = await Post.create({
      userId,
      content: content || '',
      media,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      status: 'active',
      moderationReason: null,
      moderatedBy: null,
      moderatedAt: null
    });

    const user = await User.findById(userId);

    res.status(201).json({
      id: post.id,
      userId: post.userId,
      username: user?.username || 'Unknown User',
      userAvatar: user?.profileImage,
      content: post.content,
      media: post.media,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      sharesCount: post.sharesCount,
      isLiked: false,
      createdAt: post.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

export const likePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    if (!postId || !userId) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Check if already liked
    const existingLike = await Like.findByUserAndPost(userId, postId);
    if (existingLike) {
      res.status(400).json({ error: 'Already liked this post' });
      return;
    }

    await Like.create({
      userId,
      postId,
      updatedAt: new Date()
    });

    const post = await Post.findByPk(postId);
    if (post) {
      await post.update({ likesCount: (post.likesCount || 0) + 1 });
    }

    res.status(200).json({ message: 'Post liked successfully' });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
};

export const unlikePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    if (!postId || !userId) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const like = await Like.findByUserAndPost(userId, postId);
    if (!like) {
      res.status(404).json({ error: 'Like not found' });
      return;
    }

    await like.delete();

    const post = await Post.findByPk(postId);
    if (post) {
      await post.update({ likesCount: Math.max(0, (post.likesCount || 1) - 1) });
    }

    res.status(200).json({ message: 'Post unliked successfully' });
  } catch (error) {
    console.error('Error unliking post:', error);
    res.status(500).json({ error: 'Failed to unlike post' });
  }
};

export const sharePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;

    if (!postId) {
      res.status(400).json({ error: 'Post ID is required' });
      return;
    }

    const post = await Post.findByPk(postId);
    if (post) {
      await post.update({ sharesCount: (post.sharesCount || 0) + 1 });
    }

    res.status(200).json({ message: 'Post shared successfully' });
  } catch (error) {
    console.error('Error sharing post:', error);
    res.status(500).json({ error: 'Failed to share post' });
  }
};

// Comments
export const getComments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;
    const limit = 10;

    if (!postId) {
      res.status(400).json({ error: 'Post ID is required' });
      return;
    }

    const comments = await Comment.findByPostId({
      postId,
      limit: limit + 1
    });

    const hasMore = comments.length > limit;
    const formattedComments = await Promise.all(
      comments.slice(0, limit).map(async comment => {
        const user = await User.findById(comment.userId);
        const isLiked = userId ? await CommentLike.findByUserAndComment(userId, comment.id) : false;

        return {
          id: comment.id,
          userId: comment.userId,
          username: user?.username || 'Unknown User',
          userAvatar: user?.profileImage,
          content: comment.content,
          likesCount: comment.likesCount,
          isLiked: !!isLiked,
          createdAt: comment.createdAt.toISOString()
        };
      })
    );

    res.json({
      comments: formattedComments,
      hasMore,
      nextCursor: hasMore && comments.length > 0 ? comments[comments.length - 1].createdAt.toISOString() : null
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

export const createComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!postId || !userId || !content) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const comment = await Comment.create({
      userId,
      postId,
      parentId: null,
      content,
      likesCount: 0,
      status: 'active',
      moderationReason: null,
      moderatedBy: null,
      moderatedAt: null
    });

    const post = await Post.findByPk(postId);
    if (post) {
      await post.update({ commentsCount: (post.commentsCount || 0) + 1 });
    }

    const user = await User.findById(userId);

    res.status(201).json({
      id: comment.id,
      userId: comment.userId,
      username: user?.username || 'Unknown User',
      userAvatar: user?.profileImage,
      content: comment.content,
      likesCount: comment.likesCount,
      isLiked: false,
      createdAt: comment.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

export const likeComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    if (!commentId || !userId) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Check if already liked
    const existingLike = await CommentLike.findByUserAndComment(userId, commentId);
    if (existingLike) {
      res.status(400).json({ error: 'Already liked this comment' });
      return;
    }

    await CommentLike.create({
      userId,
      commentId,
      updatedAt: new Date()
    });

    const comment = await Comment.findByPk(commentId);
    if (comment) {
      await comment.update({ likesCount: (comment.likesCount || 0) + 1 });
    }

    res.status(200).json({ message: 'Comment liked successfully' });
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({ error: 'Failed to like comment' });
  }
};

export const unlikeComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    if (!commentId || !userId) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const like = await CommentLike.findByUserAndComment(userId, commentId);
    if (!like) {
      res.status(404).json({ error: 'Like not found' });
      return;
    }

    await like.delete();

    const comment = await Comment.findByPk(commentId);
    if (comment) {
      await comment.update({ likesCount: Math.max(0, (comment.likesCount || 1) - 1) });
    }

    res.status(200).json({ message: 'Comment unliked successfully' });
  } catch (error) {
    console.error('Error unliking comment:', error);
    res.status(500).json({ error: 'Failed to unlike comment' });
  }
};

export const replyToComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!commentId || !userId || !content) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const parentComment = await Comment.findByPk(commentId);
    if (!parentComment) {
      res.status(404).json({ error: 'Parent comment not found' });
      return;
    }

    const reply = await Comment.create({
      userId,
      postId: parentComment.postId,
      parentId: commentId,
      content,
      likesCount: 0,
      status: 'active',
      moderationReason: null,
      moderatedBy: null,
      moderatedAt: null
    });

    const post = await Post.findByPk(parentComment.postId);
    if (post) {
      await post.update({ commentsCount: (post.commentsCount || 0) + 1 });
    }

    const user = await User.findById(userId);

    res.status(201).json({
      id: reply.id,
      userId: reply.userId,
      username: user?.username || 'Unknown User',
      userAvatar: user?.profileImage,
      content: reply.content,
      likesCount: reply.likesCount,
      isLiked: false,
      createdAt: reply.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Error replying to comment:', error);
    res.status(500).json({ error: 'Failed to reply to comment' });
  }
}; 