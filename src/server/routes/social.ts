import Router from 'express';
import { authenticate } from '../middleware/auth';
import { customValidate } from '../middleware/customValidate';
import {
  createPostSchema,
  postIdParamSchema,
  createCommentSchema,
  commentIdParamSchema,
  replyToCommentSchema,
  userIdParamSchema,
  feedQuerySchema,
  getCommentsQuerySchema
} from '../validators/custom-social.validator';
import {
  getUserProfileHandler,
  followUser,
  unfollowUser,
  getFeed,
  createPost,
  likePost,
  unlikePost,
  sharePost,
  getComments,
  createComment,
  likeComment,
  unlikeComment,
  replyToComment
} from '../controllers/social.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User profile routes
router.get('/users/:userId', customValidate(userIdParamSchema, 'params'), getUserProfileHandler);
router.post('/users/:userId/follow', customValidate(userIdParamSchema, 'params'), followUser);
router.delete('/users/:userId/follow', customValidate(userIdParamSchema, 'params'), unfollowUser);

// Feed routes
router.get('/feed', customValidate(feedQuerySchema, 'query'), getFeed);

// Post routes
router.post('/posts', customValidate(createPostSchema), createPost);
router.post('/posts/:postId/like', customValidate(postIdParamSchema, 'params'), likePost);
router.delete('/posts/:postId/like', customValidate(postIdParamSchema, 'params'), unlikePost);
router.post('/posts/:postId/share', customValidate(postIdParamSchema, 'params'), sharePost);

// Comment routes
router.get('/posts/:postId/comments', 
  customValidate(postIdParamSchema, 'params'),
  customValidate(getCommentsQuerySchema, 'query'),
  getComments
);
router.post('/posts/:postId/comments', 
  customValidate(postIdParamSchema, 'params'),
  customValidate(createCommentSchema),
  createComment
);
router.post('/comments/:commentId/like', 
  customValidate(commentIdParamSchema, 'params'),
  likeComment
);
router.delete('/comments/:commentId/like', 
  customValidate(commentIdParamSchema, 'params'),
  unlikeComment
);
router.post('/comments/:commentId/reply', 
  customValidate(commentIdParamSchema, 'params'),
  customValidate(replyToCommentSchema),
  replyToComment
);

export const socialRouter = router; 