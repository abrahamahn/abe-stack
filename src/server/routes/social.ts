import express from 'express';

import { getPostById, deletePost } from '../controllers/post.controller';
import {
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
import { authenticate } from '../domains/auth/middleware/auth.middleware';
import { customValidate } from '../middleware/customValidate';
import {
  createPostSchema,
  postIdParamSchema,
  createCommentSchema,
  commentIdParamSchema,
  replyToCommentSchema,
  feedQuerySchema,
  getCommentsQuerySchema
} from '../validators/custom-social.validator';

const router: express.Router = express.Router();

// All routes require authentication
router.use(authenticate);

// Feed routes
router.get('/feed', customValidate(feedQuerySchema, 'query'), getFeed);

// Post routes
router.post('/posts', customValidate(createPostSchema), createPost);
router.get('/posts/:postId', customValidate(postIdParamSchema, 'params'), getPostById);
router.delete('/posts/:postId', customValidate(postIdParamSchema, 'params'), deletePost);
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

export const socialRouter: express.Router = router; 