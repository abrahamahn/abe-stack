import Router from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createPostSchema,
  postIdParamSchema,
  createCommentSchema,
  commentIdParamSchema,
  replyToCommentSchema,
  userIdParamSchema,
  feedQuerySchema,
  getCommentsQuerySchema
} from '../validators/social.validator';
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
router.get('/users/:userId', validate(userIdParamSchema, 'params'), getUserProfileHandler);
router.post('/users/:userId/follow', validate(userIdParamSchema, 'params'), followUser);
router.delete('/users/:userId/follow', validate(userIdParamSchema, 'params'), unfollowUser);

// Feed routes
router.get('/feed', validate(feedQuerySchema, 'query'), getFeed);

// Post routes
router.post('/posts', validate(createPostSchema), createPost);
router.post('/posts/:postId/like', validate(postIdParamSchema, 'params'), likePost);
router.delete('/posts/:postId/like', validate(postIdParamSchema, 'params'), unlikePost);
router.post('/posts/:postId/share', validate(postIdParamSchema, 'params'), sharePost);

// Comment routes
router.get('/posts/:postId/comments', 
  validate(postIdParamSchema, 'params'),
  validate(getCommentsQuerySchema, 'query'),
  getComments
);
router.post('/posts/:postId/comments', 
  validate(postIdParamSchema, 'params'),
  validate(createCommentSchema),
  createComment
);
router.post('/comments/:commentId/like', 
  validate(commentIdParamSchema, 'params'),
  likeComment
);
router.delete('/comments/:commentId/like', 
  validate(commentIdParamSchema, 'params'),
  unlikeComment
);
router.post('/comments/:commentId/reply', 
  validate(commentIdParamSchema, 'params'),
  validate(replyToCommentSchema),
  replyToComment
);

export const socialRouter = router; 