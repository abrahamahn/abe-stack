import express from 'express';
import type { Response, NextFunction } from 'express';

import { followUser, unfollowUser } from '../controllers/social.controller';
import { authenticate } from '../domains/auth/middleware/auth.middleware';
import { AppError } from '../middleware/error';
import { User, Post, Follow } from '../database/models';
import { AuthenticatedRequest, UserParamRequest } from '../types/request.types';

interface UserResponse {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  profileImage: string | null;
  posts?: Post[];
  isFollowing?: boolean;
}

const router: express.Router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user profile
router.get('/:userId', async (req: UserParamRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      throw new AppError('User ID is required', 400);
    }
    
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Get user's posts
    const posts = await Post.findByUserId(user.id);

    // Check if current user is following this user
    const currentUserId = req.user?.userId;
    const isFollowing = currentUserId ? await Follow.findByFollowerAndFollowing(currentUserId, user.id) : null;

    const userResponse: UserResponse = {
      ...user,
      posts,
      isFollowing: !!isFollowing
    };

    res.json({
      status: 'success',
      data: { user: userResponse }
    });
  } catch (error) {
    next(error);
  }
});

// Follow a user
router.post('/:userId/follow', async (req: AuthenticatedRequest, res: Response) => {
  await followUser(req, res);
});

// Unfollow a user
router.delete('/:userId/follow', async (req: AuthenticatedRequest, res: Response) => {
  await unfollowUser(req, res);
});

// Update user profile
router.patch('/me', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { displayName, bio, avatar } = req.body as { displayName: string, bio: string, avatar: string };
    const currentUserId = req.user?.userId;
    
    if (!currentUserId) {
      throw new AppError('Authentication required', 401);
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update user
    await User.update(currentUserId, {
      displayName,
      bio,
      profileImage: avatar
    });

    const updatedUser = await User.findById(currentUserId);
    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }

    res.json({
      status: 'success',
      data: { user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
});

// Get user's followers
router.get('/:userId/followers', async (req: UserParamRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      throw new AppError('User ID is required', 400);
    }
    
    const followers = await Follow.findFollowers(userId);

    res.json({
      status: 'success',
      data: { followers }
    });
  } catch (error) {
    next(error);
  }
});

// Get user's following
router.get('/:userId/following', async (req: UserParamRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      throw new AppError('User ID is required', 400);
    }
    
    const following = await Follow.findFollowing(userId);

    res.json({
      status: 'success',
      data: { following }
    });
  } catch (error) {
    next(error);
  }
});

export const userRouter: express.Router = router; 