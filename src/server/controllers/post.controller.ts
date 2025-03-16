import { Response, NextFunction } from 'express';

import { AppError } from '../middleware/error';
import { Post, Like } from '../models';
import { PostParamRequest } from '../types/request.types';

/**
 * Get a single post by ID
 */
export const getPostById = async (req: PostParamRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { postId } = req.params;
    const post = await Post.findByPk(postId);

    if (!post) {
      throw new AppError('Post not found', 404);
    }

    // Check if current user liked the post
    let like = null;
    if (req.user) {
      like = await Like.findByUserAndPost(req.user.id, post.id);
    }

    const postData = post.toJSON();
    postData.isLiked = !!like;

    res.json({
      status: 'success',
      data: { post: postData }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a post
 */
export const deletePost = async (req: PostParamRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { postId } = req.params;
    const post = await Post.findByPk(postId);

    if (!post) {
      throw new AppError('Post not found', 404);
    }

    if (post.userId !== req.user?.id) {
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
}; 