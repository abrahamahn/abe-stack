import Router from 'express';
import type { Request, Response, NextFunction } from 'express';
import { User, Post, Follow } from '../models';
import { AppError } from '../middleware/error';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get user profile
router.get('/:userId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByPk(req.params.userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Get user's posts
    const posts = await Post.findByUserId(user.id);

    // Check if current user is following this user
    const isFollowing = await Follow.findByFollowerAndFollowing((req.user as any)?.id, user.id);

    const userResponse = user.toJSON();
    userResponse.posts = posts;
    userResponse.isFollowing = !!isFollowing;

    res.json({
      status: 'success',
      data: { user: userResponse }
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.patch('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { displayName, bio, avatar } = req.body;

    const user = await User.findByPk((req.user as any)?.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update user
    await user.update({
      displayName,
      bio,
      profileImage: avatar
    });

    res.json({
      status: 'success',
      data: { user: user.toJSON() }
    });
  } catch (error) {
    next(error);
  }
});

// Follow user
router.post('/:userId/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userToFollow = await User.findByPk(req.params.userId);
    if (!userToFollow) {
      throw new AppError('User not found', 404);
    }

    if (userToFollow.id === (req.user as any)?.id) {
      throw new AppError('Cannot follow yourself', 400);
    }

    // Check if already following
    const existingFollow = await Follow.findByFollowerAndFollowing((req.user as any)?.id, userToFollow.id);

    if (existingFollow) {
      throw new AppError('Already following this user', 400);
    }

    // Create follow relationship
    await Follow.create({
      followerId: (req.user as any)?.id,
      followingId: userToFollow.id
    });

    res.json({
      status: 'success',
      message: 'Successfully followed user'
    });
  } catch (error) {
    next(error);
  }
});

// Unfollow user
router.delete('/:userId/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userToUnfollow = await User.findByPk(req.params.userId);
    if (!userToUnfollow) {
      throw new AppError('User not found', 404);
    }

    // Check if following
    const follow = await Follow.findByFollowerAndFollowing((req.user as any)?.id, userToUnfollow.id);

    if (!follow) {
      throw new AppError('Not following this user', 400);
    }

    // Remove follow relationship
    await follow.delete();

    res.json({
      status: 'success',
      message: 'Successfully unfollowed user'
    });
  } catch (error) {
    next(error);
  }
});

// Get user's followers
router.get('/:userId/followers', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const followers = await Follow.findFollowers(req.params.userId);

    res.json({
      status: 'success',
      data: { followers }
    });
  } catch (error) {
    next(error);
  }
});

// Get user's following
router.get('/:userId/following', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const following = await Follow.findFollowing(req.params.userId);

    res.json({
      status: 'success',
      data: { following }
    });
  } catch (error) {
    next(error);
  }
});

export const userRouter = router; 