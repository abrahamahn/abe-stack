import { Router } from 'express';
import { User, Post, Follow } from '../models';
import { AppError } from '../middleware/error';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get user profile
router.get('/:userId', authenticate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Get user's posts
    const posts = await Post.findByUserId(user.id);

    // Check if current user is following this user
    const isFollowing = await Follow.findByFollowerAndFollowing(req.user!.id, user.id);

    const userResponse = user.toJSON();
    delete userResponse.password;
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
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const { displayName, bio, avatar } = req.body;

    const user = await User.findByPk(req.user!.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update user
    await user.update({
      displayName,
      bio,
      avatar
    });

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      status: 'success',
      data: { user: userResponse }
    });
  } catch (error) {
    next(error);
  }
});

// Follow user
router.post('/:userId/follow', authenticate, async (req, res, next) => {
  try {
    const userToFollow = await User.findByPk(req.params.userId);
    if (!userToFollow) {
      throw new AppError('User not found', 404);
    }

    if (userToFollow.id === req.user!.id) {
      throw new AppError('Cannot follow yourself', 400);
    }

    // Check if already following
    const existingFollow = await Follow.findByFollowerAndFollowing(req.user!.id, userToFollow.id);

    if (existingFollow) {
      throw new AppError('Already following this user', 400);
    }

    // Create follow relationship
    await Follow.create({
      followerId: req.user!.id,
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
router.delete('/:userId/follow', authenticate, async (req, res, next) => {
  try {
    const userToUnfollow = await User.findByPk(req.params.userId);
    if (!userToUnfollow) {
      throw new AppError('User not found', 404);
    }

    // Check if following
    const follow = await Follow.findByFollowerAndFollowing(req.user!.id, userToUnfollow.id);

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
router.get('/:userId/followers', authenticate, async (req, res, next) => {
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
router.get('/:userId/following', authenticate, async (req, res, next) => {
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