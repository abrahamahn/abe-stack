import type { Request, Response } from 'express-serve-static-core';
import { Post, Comment, Like, CommentLike, Follow } from '../models';
import { uploadToStorage } from '../lib/storage';
import User from '../models/User';

// User Profile
export const getUserProfileHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;

    const user = await (User.findByPk as any)(userId, {
      include: [
        {
          model: Follow,
          as: 'followers',
          where: currentUserId ? { followerId: currentUserId } : undefined,
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = user.toJSON();
    // Use type assertion to handle the followers property
    const userDataAny = userData as any;
    const isFollowing = userDataAny.followers && userDataAny.followers.length > 0;
    userDataAny.followers = undefined;

    res.json({
      ...userDataAny,
      isFollowing,
      followersCount: await (Follow as any).count({ where: { followingId: userId } }),
      followingCount: await (Follow as any).count({ where: { followerId: userId } }),
      postsCount: await (Post as any).count({ where: { userId } })
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

// Helper function for other parts of the application
export async function getUserProfile(userId: string, currentUserId?: string): Promise<any> {
  const user = await User.findByPk(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Get user data without sensitive information
  const userData = (user as any).toSafeObject();
  
  // Check if current user is following this user
  let isFollowing = false;
  if (currentUserId) {
    // This would need to be implemented based on your follow model
    // For example: isFollowing = await Follow.exists({ followerId: currentUserId, followingId: userId });
  }
  
  // Add isFollowing flag to the response
  return {
    ...userData,
    isFollowing
  };
}

// Follow/Unfollow
export const followUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const followerId = req.user?.id;

    if (followerId === userId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    await Follow.create({
      followerId: followerId!,
      followingId: userId
    });

    res.status(200).json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
};

export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const followerId = req.user?.id;

    await (Follow as any).destroy({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId
        }
      }
    });

    res.status(200).json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
};

// Feed
export const getFeed = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { cursor } = req.query;
    const limit = 10;

    // Build where clause based on cursor
    let where: any = {};
    if (cursor) {
      where = {
        createdAt: {
          [Symbol.for('lt')]: new Date(cursor as string)
        }
      };
    }

    const posts = await (Post as any).findAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Like,
          where: userId ? { userId } : undefined,
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: limit + 1 // Get one extra to check if there are more
    });

    const hasMore = posts.length > limit;
    const formattedPosts = posts.slice(0, limit).map((post: any) => ({
      id: post.id,
      userId: post.userId,
      username: post.user?.username ?? 'Unknown User',
      userAvatar: post.user?.avatar,
      content: post.content,
      media: post.media,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      sharesCount: post.sharesCount,
      isLiked: (post.likes ?? []).length > 0,
      createdAt: post.createdAt
    }));

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
export const createPost = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const userId = req.user?.id;
    let media;

    // Handle file upload if present
    if (req.file) {
      const url = await uploadToStorage(req.file);
      media = {
        type: req.file.mimetype.startsWith('image/') ? 'image' : 'video',
        url
      };
    }

    const post = await Post.create({
      content,
      media: media as any,
      userId: userId!,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      status: 'active'
    } as any);

    res.status(201).json({
      id: post.id,
      userId: post.userId,
      username: (post as any).user?.username ?? 'Unknown User',
      userAvatar: (post as any).user?.avatar,
      content: post.content,
      media: post.media,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      sharesCount: post.sharesCount,
      isLiked: false,
      createdAt: post.createdAt
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

export const likePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    await Like.create({
      userId: userId!,
      postId,
      updatedAt: new Date()
    } as any);

    await (Post as any).increment('likesCount', {
      where: { id: postId }
    });

    res.status(200).json({ message: 'Post liked successfully' });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
};

export const unlikePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    await (Like as any).destroy({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    await (Post as any).decrement('likesCount', {
      where: { id: postId }
    });

    res.status(200).json({ message: 'Post unliked successfully' });
  } catch (error) {
    console.error('Error unliking post:', error);
    res.status(500).json({ error: 'Failed to unlike post' });
  }
};

export const sharePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    await (Post as any).increment('sharesCount', {
      where: { id: postId }
    });

    res.status(200).json({ message: 'Post shared successfully' });
  } catch (error) {
    console.error('Error sharing post:', error);
    res.status(500).json({ error: 'Failed to share post' });
  }
};

// Comments
export const getComments = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;
    const { cursor } = req.query;
    const limit = 10;

    const comments = await (Comment as any).findAll({
      where: { postId },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: CommentLike,
          as: 'likes',
          where: userId ? { userId } : undefined,
          required: false
        },
        {
          model: Comment,
          as: 'replies',
          include: [
            {
              model: User,
              attributes: ['id', 'username', 'avatar']
            },
            {
              model: CommentLike,
              as: 'likes',
              where: userId ? { userId } : undefined,
              required: false
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: limit + 1 // Get one extra to check if there are more
    });

    const hasMore = comments.length > limit;
    const formattedComments = comments.slice(0, limit).map((comment: any) => ({
      id: comment.id,
      userId: comment.userId,
      username: comment.user?.username ?? 'Unknown User',
      userAvatar: comment.user?.avatar,
      content: comment.content,
      likesCount: comment.likesCount,
      isLiked: (comment.likes ?? []).length > 0,
      createdAt: comment.createdAt,
      replies: (comment.replies ?? []).map((reply: any) => ({
        id: reply.id,
        userId: reply.userId,
        username: reply.user?.username ?? 'Unknown User',
        userAvatar: reply.user?.avatar,
        content: reply.content,
        likesCount: reply.likesCount,
        isLiked: (reply.likes ?? []).length > 0,
        createdAt: reply.createdAt
      }))
    }));

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

export const createComment = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    const comment = await Comment.create({
      content,
      userId: userId!,
      postId,
      likesCount: 0,
      status: 'active'
    } as any);

    await (Post as any).increment('commentsCount', {
      where: { id: postId }
    });

    res.status(201).json({
      id: comment.id,
      userId: comment.userId,
      username: (comment as any).user?.username ?? 'Unknown User',
      userAvatar: (comment as any).user?.avatar,
      content: comment.content,
      likesCount: comment.likesCount,
      isLiked: false,
      createdAt: comment.createdAt
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

export const likeComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    await CommentLike.create({
      userId: userId!,
      commentId,
      updatedAt: new Date()
    } as any);

    await (Comment as any).increment('likesCount', {
      where: { id: commentId }
    });

    res.status(200).json({ message: 'Comment liked successfully' });
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({ error: 'Failed to like comment' });
  }
};

export const unlikeComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    await (CommentLike as any).destroy({
      where: {
        userId_commentId: {
          userId,
          commentId
        }
      }
    });

    await (Comment as any).decrement('likesCount', {
      where: { id: commentId }
    });

    res.status(200).json({ message: 'Comment unliked successfully' });
  } catch (error) {
    console.error('Error unliking comment:', error);
    res.status(500).json({ error: 'Failed to unlike comment' });
  }
};

export const replyToComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    const parentComment = await (Comment.findByPk as any)(commentId, {
      include: [{
        model: Post
      }]
    });

    if (!parentComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const reply = await Comment.create({
      content,
      userId: userId!,
      postId: parentComment.postId,
      parentId: commentId,
      likesCount: 0,
      status: 'active'
    } as any);

    await (Post as any).increment('commentsCount', {
      where: { id: parentComment.postId }
    });

    res.status(201).json({
      id: reply.id,
      userId: reply.userId,
      username: (reply as any).user?.username ?? 'Unknown User',
      userAvatar: (reply as any).user?.avatar,
      content: reply.content,
      likesCount: reply.likesCount,
      isLiked: ((reply as any).likes ?? []).length > 0,
      createdAt: reply.createdAt
    });
  } catch (error) {
    console.error('Error replying to comment:', error);
    res.status(500).json({ error: 'Failed to reply to comment' });
  }
}; 