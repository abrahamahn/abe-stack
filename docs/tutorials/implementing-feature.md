# Tutorial: Implementing a Complete Feature

This guide walks you through implementing a complete feature in ABE Stack, focusing on a user commenting system as an example.

## 1. Planning Your Feature

Before writing any code, plan out your feature:

- **Feature Definition**: Users can comment on articles and reply to other comments
- **Data Requirements**: Comment text, author, timestamps, article reference, parent comment (for replies)
- **API Endpoints**: Create, read, update, delete comments
- **UI Components**: Comment form, comment display, reply interface
- **Authorization Rules**: Who can create/edit/delete comments

## 2. Database Implementation

Start by creating the database model:

```sql
-- src/server/database/migrations/[timestamp]_create_comments_table.sql
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_comments_article_id ON comments(article_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
```

## 3. Backend Implementation

### 3.1. Create the Comment Model

```typescript
// src/server/models/Comment.ts
export interface Comment {
  id: string;
  content: string;
  articleId: string;
  userId: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CommentWithUser extends Comment {
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}
```

### 3.2. Implement the Repository

```typescript
// src/server/repositories/commentRepository.ts
import { db } from '../database/connection';
import { Comment, CommentWithUser } from '../models/Comment';

export class CommentRepository {
  async findByArticleId(articleId: string): Promise<CommentWithUser[]> {
    const query = `
      SELECT c.*, u.id as user_id, u.username, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.article_id = $1 AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `;
    
    const result = await db.query(query, [articleId]);
    
    return result.rows.map(row => ({
      id: row.id,
      content: row.content,
      articleId: row.article_id,
      userId: row.user_id,
      parentId: row.parent_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      user: {
        id: row.user_id,
        username: row.username,
        avatarUrl: row.avatar_url
      }
    }));
  }

  async create(comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Comment> {
    const query = `
      INSERT INTO comments (content, article_id, user_id, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [comment.content, comment.articleId, comment.userId, comment.parentId];
    const result = await db.query(query, values);
    
    return {
      id: result.rows[0].id,
      content: result.rows[0].content,
      articleId: result.rows[0].article_id,
      userId: result.rows[0].user_id,
      parentId: result.rows[0].parent_id,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      deletedAt: result.rows[0].deleted_at
    };
  }

  async update(id: string, content: string): Promise<Comment | null> {
    const query = `
      UPDATE comments
      SET content = $1, updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `;
    
    const result = await db.query(query, [content, id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return {
      id: result.rows[0].id,
      content: result.rows[0].content,
      articleId: result.rows[0].article_id,
      userId: result.rows[0].user_id,
      parentId: result.rows[0].parent_id,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      deletedAt: result.rows[0].deleted_at
    };
  }

  async delete(id: string): Promise<boolean> {
    // Soft delete
    const query = `
      UPDATE comments
      SET deleted_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }

  async findById(id: string): Promise<Comment | null> {
    const query = `
      SELECT * FROM comments
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return {
      id: result.rows[0].id,
      content: result.rows[0].content,
      articleId: result.rows[0].article_id,
      userId: result.rows[0].user_id,
      parentId: result.rows[0].parent_id,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      deletedAt: result.rows[0].deleted_at
    };
  }
}

export const commentRepository = new CommentRepository();
```

### 3.3. Create the Service

```typescript
// src/server/services/commentService.ts
import { Comment, CommentWithUser } from '../models/Comment';
import { commentRepository } from '../repositories/commentRepository';
import { ValidationError, UnauthorizedError } from '../utils/errors';
import { sanitizeHtml } from '../utils/sanitizeHtml';

export class CommentService {
  async getCommentsByArticleId(articleId: string): Promise<CommentWithUser[]> {
    return commentRepository.findByArticleId(articleId);
  }

  async createComment(
    content: string,
    articleId: string,
    userId: string,
    parentId?: string
  ): Promise<Comment> {
    // Validate input
    if (!content || content.trim() === '') {
      throw new ValidationError('Comment content is required');
    }
    
    // Sanitize content to prevent XSS
    const sanitizedContent = sanitizeHtml(content);
    
    return commentRepository.create({
      content: sanitizedContent,
      articleId,
      userId,
      parentId: parentId || null
    });
  }

  async updateComment(id: string, content: string, userId: string): Promise<Comment> {
    // Check if comment exists and belongs to user
    const comment = await commentRepository.findById(id);
    
    if (!comment) {
      throw new ValidationError('Comment not found');
    }
    
    if (comment.userId !== userId) {
      throw new UnauthorizedError('You can only edit your own comments');
    }
    
    // Validate and sanitize content
    if (!content || content.trim() === '') {
      throw new ValidationError('Comment content is required');
    }
    
    const sanitizedContent = sanitizeHtml(content);
    
    const updatedComment = await commentRepository.update(id, sanitizedContent);
    
    if (!updatedComment) {
      throw new ValidationError('Failed to update comment');
    }
    
    return updatedComment;
  }

  async deleteComment(id: string, userId: string, isAdmin: boolean): Promise<boolean> {
    const comment = await commentRepository.findById(id);
    
    if (!comment) {
      throw new ValidationError('Comment not found');
    }
    
    // Only allow the comment author or admins to delete
    if (comment.userId !== userId && !isAdmin) {
      throw new UnauthorizedError('You cannot delete this comment');
    }
    
    return commentRepository.delete(id);
  }
}

export const commentService = new CommentService();
```

### 3.4. Implement Controller

```typescript
// src/server/controllers/commentController.ts
import { Request, Response } from 'express';
import { commentService } from '../services/commentService';
import { asyncHandler } from '../utils/asyncHandler';

export const commentController = {
  getByArticleId: asyncHandler(async (req: Request, res: Response) => {
    const articleId = req.params.articleId;
    const comments = await commentService.getCommentsByArticleId(articleId);
    res.json(comments);
  }),

  createComment: asyncHandler(async (req: Request, res: Response) => {
    const { content, articleId, parentId } = req.body;
    const userId = req.user.id; // Assuming auth middleware adds user to req
    
    const comment = await commentService.createComment(
      content,
      articleId,
      userId,
      parentId
    );
    
    res.status(201).json(comment);
  }),

  updateComment: asyncHandler(async (req: Request, res: Response) => {
    const { content } = req.body;
    const commentId = req.params.id;
    const userId = req.user.id;
    
    const comment = await commentService.updateComment(commentId, content, userId);
    res.json(comment);
  }),

  deleteComment: asyncHandler(async (req: Request, res: Response) => {
    const commentId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin'; // Assuming role is added by auth middleware
    
    await commentService.deleteComment(commentId, userId, isAdmin);
    res.status(204).end();
  })
};
```

### 3.5. Create Routes

```typescript
// src/server/routes/commentRoutes.ts
import express from 'express';
import { commentController } from '../controllers/commentController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/article/:articleId', commentController.getByArticleId);

// Protected routes
router.post('/', authMiddleware, commentController.createComment);
router.put('/:id', authMiddleware, commentController.updateComment);
router.delete('/:id', authMiddleware, commentController.deleteComment);

export default router;
```

### 3.6. Register Routes

```typescript
// src/server/app.ts (or equivalent file)
import commentRoutes from './routes/commentRoutes';

// ... existing code ...

app.use('/api/comments', commentRoutes);

// ... other code ...
```

## 4. Frontend Implementation

### 4.1. API Client

```typescript
// src/client/services/api/comments.ts
import { apiClient } from './apiClient';
import { Comment, CommentWithUser } from '../../types/Comment';

export const CommentAPI = {
  getByArticleId: async (articleId: string): Promise<CommentWithUser[]> => {
    const response = await apiClient.get(`/comments/article/${articleId}`);
    return response.data;
  },
  
  create: async (comment: {
    content: string;
    articleId: string;
    parentId?: string;
  }): Promise<Comment> => {
    const response = await apiClient.post('/comments', comment);
    return response.data;
  },
  
  update: async (id: string, content: string): Promise<Comment> => {
    const response = await apiClient.put(`/comments/${id}`, { content });
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/comments/${id}`);
  }
};
```

### 4.2. Comment Form Component

```tsx
// src/client/components/organisms/CommentForm/CommentForm.tsx
import React, { useState } from 'react';
import { Button } from '../../atoms/Button';
import './CommentForm.css';

interface CommentFormProps {
  articleId: string;
  parentId?: string;
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  buttonText?: string;
  isReply?: boolean;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  articleId,
  parentId,
  onSubmit,
  placeholder = 'Write a comment...',
  buttonText = 'Submit',
  isReply = false
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Comment cannot be empty.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await onSubmit(content);
      setContent('');
    } catch (err) {
      setError('Failed to submit your comment. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form 
      className={`comment-form ${isReply ? 'comment-form-reply' : ''}`} 
      onSubmit={handleSubmit}
    >
      <textarea
        className="comment-form-textarea"
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={placeholder}
        rows={isReply ? 3 : 4}
        disabled={isSubmitting}
      />
      
      {error && <div className="comment-form-error">{error}</div>}
      
      <div className="comment-form-actions">
        <Button 
          type="submit" 
          variant="primary" 
          size={isReply ? 'small' : 'medium'}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : buttonText}
        </Button>
      </div>
    </form>
  );
};
```

### 4.3. Comment Display Component

```tsx
// src/client/components/organisms/CommentList/CommentItem.tsx
import React, { useState } from 'react';
import { CommentWithUser } from '../../../types/Comment';
import { CommentForm } from '../CommentForm/CommentForm';
import { Button } from '../../atoms/Button';
import { formatDate } from '../../../utils/formatDate';
import { useAuth } from '../../../hooks/useAuth';
import { CommentAPI } from '../../../services/api/comments';
import './CommentItem.css';

interface CommentItemProps {
  comment: CommentWithUser;
  onReply: (comment: CommentWithUser) => void;
  onUpdate: (comment: CommentWithUser) => void;
  onDelete: (commentId: string) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onUpdate,
  onDelete
}) => {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState(comment.content);
  
  const isAuthor = user?.id === comment.userId;
  const isAdmin = user?.role === 'admin';
  
  const handleReplySubmit = async (content: string) => {
    try {
      const newComment = await CommentAPI.create({
        content,
        articleId: comment.articleId,
        parentId: comment.id
      });
      
      onReply({
        ...newComment,
        user: {
          id: user!.id,
          username: user!.username,
          avatarUrl: user!.avatarUrl
        }
      });
      
      setIsReplying(false);
    } catch (error) {
      console.error('Failed to submit reply:', error);
    }
  };
  
  const handleEditSubmit = async () => {
    try {
      const updatedComment = await CommentAPI.update(comment.id, editableContent);
      onUpdate({
        ...updatedComment,
        user: comment.user
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await CommentAPI.delete(comment.id);
        onDelete(comment.id);
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    }
  };
  
  return (
    <div className="comment-item">
      <div className="comment-avatar">
        <img 
          src={comment.user.avatarUrl || '/images/default-avatar.png'} 
          alt={comment.user.username} 
        />
      </div>
      
      <div className="comment-content">
        <div className="comment-header">
          <h4 className="comment-author">{comment.user.username}</h4>
          <span className="comment-date">{formatDate(comment.createdAt)}</span>
        </div>
        
        {isEditing ? (
          <div className="comment-edit">
            <textarea 
              value={editableContent}
              onChange={e => setEditableContent(e.target.value)}
              rows={3}
            />
            <div className="comment-edit-actions">
              <Button 
                variant="primary" 
                size="small" 
                onClick={handleEditSubmit}
              >
                Save
              </Button>
              <Button 
                variant="secondary" 
                size="small" 
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="comment-text">{comment.content}</p>
        )}
        
        <div className="comment-actions">
          {user && (
            <button 
              className="comment-action-button" 
              onClick={() => setIsReplying(!isReplying)}
            >
              {isReplying ? 'Cancel Reply' : 'Reply'}
            </button>
          )}
          
          {isAuthor && (
            <button 
              className="comment-action-button" 
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel Edit' : 'Edit'}
            </button>
          )}
          
          {(isAuthor || isAdmin) && (
            <button 
              className="comment-action-button comment-action-delete" 
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
        </div>
        
        {isReplying && (
          <div className="comment-reply-form">
            <CommentForm
              articleId={comment.articleId}
              parentId={comment.id}
              onSubmit={handleReplySubmit}
              placeholder="Write your reply..."
              buttonText="Reply"
              isReply
            />
          </div>
        )}
      </div>
    </div>
  );
};
```

### 4.4. Comment List Component

```tsx
// src/client/components/organisms/CommentList/CommentList.tsx
import React, { useEffect, useState } from 'react';
import { CommentWithUser } from '../../../types/Comment';
import { CommentItem } from './CommentItem';
import { CommentForm } from '../CommentForm/CommentForm';
import { CommentAPI } from '../../../services/api/comments';
import { useAuth } from '../../../hooks/useAuth';
import './CommentList.css';

interface CommentListProps {
  articleId: string;
}

interface CommentThread {
  comment: CommentWithUser;
  replies: CommentWithUser[];
}

export const CommentList: React.FC<CommentListProps> = ({ articleId }) => {
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      try {
        const data = await CommentAPI.getByArticleId(articleId);
        setComments(data);
        setError(null);
      } catch (err) {
        setError('Failed to load comments.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [articleId]);

  const handleSubmitComment = async (content: string) => {
    try {
      const newComment = await CommentAPI.create({
        content,
        articleId
      });
      
      // Add user information to the new comment
      const commentWithUser: CommentWithUser = {
        ...newComment,
        user: {
          id: user!.id,
          username: user!.username,
          avatarUrl: user!.avatarUrl
        }
      };
      
      setComments(prev => [commentWithUser, ...prev]);
    } catch (error) {
      console.error('Failed to submit comment:', error);
      throw error;
    }
  };

  const handleReply = (newComment: CommentWithUser) => {
    setComments(prev => [...prev, newComment]);
  };

  const handleUpdate = (updatedComment: CommentWithUser) => {
    setComments(prev => 
      prev.map(comment => 
        comment.id === updatedComment.id ? updatedComment : comment
      )
    );
  };

  const handleDelete = (commentId: string) => {
    setComments(prev => prev.filter(comment => comment.id !== commentId));
  };

  // Organize comments into threads (top-level comments and their replies)
  const organizeCommentsIntoThreads = (): CommentThread[] => {
    const topLevelComments = comments.filter(comment => !comment.parentId);
    const commentThreads = topLevelComments.map(comment => {
      const replies = comments.filter(reply => reply.parentId === comment.id);
      return { comment, replies };
    });
    
    return commentThreads;
  };

  const commentThreads = organizeCommentsIntoThreads();

  if (loading) return <div className="comments-loading">Loading comments...</div>;
  if (error) return <div className="comments-error">{error}</div>;

  return (
    <div className="comments-section">
      <h3 className="comments-title">Comments ({comments.length})</h3>
      
      {user && (
        <div className="comments-form-container">
          <CommentForm
            articleId={articleId}
            onSubmit={handleSubmitComment}
            placeholder="What are your thoughts?"
            buttonText="Post Comment"
          />
        </div>
      )}
      
      <div className="comments-list">
        {commentThreads.length === 0 ? (
          <div className="comments-empty">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          commentThreads.map(({ comment, replies }) => (
            <div key={comment.id} className="comment-thread">
              <CommentItem
                comment={comment}
                onReply={handleReply}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
              
              {replies.length > 0 && (
                <div className="comment-replies">
                  {replies.map(reply => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      onReply={handleReply}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
```

### 4.5. Integration with Article Page

```tsx
// src/client/pages/ArticlePage/ArticlePage.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CommentList } from '../../components/organisms/CommentList/CommentList';
import { Article } from '../../types/Article';
import { ArticleAPI } from '../../services/api/articles';
import './ArticlePage.css';

export const ArticlePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const data = await ArticleAPI.getById(id);
        setArticle(data);
        setError(null);
      } catch (err) {
        setError('Failed to load article.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  if (loading) return <div className="article-loading">Loading article...</div>;
  if (error || !article) return <div className="article-error">{error || 'Article not found'}</div>;

  return (
    <div className="article-page">
      <article className="article-content">
        <h1 className="article-title">{article.title}</h1>
        <div className="article-meta">
          <span className="article-author">By {article.author.name}</span>
          <span className="article-date">
            {new Date(article.publishedAt).toLocaleDateString()}
          </span>
        </div>
        
        {article.coverImage && (
          <img 
            src={article.coverImage} 
            alt={article.title} 
            className="article-cover-image" 
          />
        )}
        
        <div 
          className="article-body"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </article>
      
      <section className="article-comments">
        <CommentList articleId={article.id} />
      </section>
    </div>
  );
};
```

## 5. Testing Your Feature

### 5.1. Backend Tests

```typescript
// src/server/services/__tests__/commentService.test.ts
import { commentService } from '../commentService';
import { commentRepository } from '../../repositories/commentRepository';
import { ValidationError, UnauthorizedError } from '../../utils/errors';

// Mock the repository
jest.mock('../../repositories/commentRepository');

describe('CommentService', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const mockComment = {
        id: '123',
        content: 'Test comment',
        articleId: 'article-123',
        userId: 'user-123',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };
      
      // Mock the repository method
      (commentRepository.create as jest.Mock).mockResolvedValue(mockComment);
      
      const result = await commentService.createComment(
        'Test comment',
        'article-123',
        'user-123'
      );
      
      expect(result).toEqual(mockComment);
      expect(commentRepository.create).toHaveBeenCalledWith({
        content: 'Test comment',
        articleId: 'article-123',
        userId: 'user-123',
        parentId: null
      });
    });

    it('should throw an error if content is empty', async () => {
      await expect(
        commentService.createComment('', 'article-123', 'user-123')
      ).rejects.toThrow(ValidationError);
    });
  });

  // More tests for other methods
});
```

### 5.2. Frontend Tests

```typescript
// src/client/components/organisms/CommentList/__tests__/CommentItem.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommentItem } from '../CommentItem';
import { CommentAPI } from '../../../../services/api/comments';

// Mock the API and hooks
jest.mock('../../../../services/api/comments');
jest.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-123',
      username: 'testuser',
      avatarUrl: null,
      role: 'user'
    }
  })
}));

describe('CommentItem', () => {
  const mockComment = {
    id: 'comment-123',
    content: 'This is a test comment',
    articleId: 'article-123',
    userId: 'user-123',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    user: {
      id: 'user-123',
      username: 'testuser',
      avatarUrl: null
    }
  };
  
  const mockProps = {
    comment: mockComment,
    onReply: jest.fn(),
    onUpdate: jest.fn(),
    onDelete: jest.fn()
  };

  it('renders the comment content correctly', () => {
    render(<CommentItem {...mockProps} />);
    
    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('shows edit options for the comment author', () => {
    render(<CommentItem {...mockProps} />);
    
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('toggles edit mode when Edit button is clicked', () => {
    render(<CommentItem {...mockProps} />);
    
    fireEvent.click(screen.getByText('Edit'));
    
    // Check that we're in edit mode
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    
    // Check the textarea has the comment content
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('This is a test comment');
  });

  // More tests for other functionality
});
```

## 6. Documentation

Create documentation for your feature:

```markdown
# Comment System Documentation

## Overview

The comment system allows users to engage with content by posting comments on articles and replying to other comments.

## Features

- Post comments on articles
- Reply to existing comments
- Edit your own comments
- Delete your own comments (admins can delete any comment)
- View nested comment threads

## Technical Implementation

### Database

Comments are stored in the `comments` table with relationships to:
- The article they belong to
- The user who created them
- Optionally, a parent comment (for replies)

### API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|--------------|
| `/api/comments/article/:articleId` | GET | Get all comments for an article | No |
| `/api/comments` | POST | Create a new comment | Yes |
| `/api/comments/:id` | PUT | Update a comment | Yes |
| `/api/comments/:id` | DELETE | Delete a comment | Yes |

### Components

- `CommentList`: Displays all comments for an article
- `CommentItem`: Renders a single comment with actions
- `CommentForm`: Form for creating and editing comments

## Usage Example

```tsx
// In your article page component:
import { CommentList } from '../components/organisms/CommentList';

const ArticlePage = ({ article }) => {
  return (
    <div>
      {/* Article content */}
      <CommentList articleId={article.id} />
    </div>
  );
};
```

By following this structured approach, you've implemented a complete feature with proper separation of concerns across the frontend and backend.

## Best Practices for Feature Implementation

1. **Plan First**: Define the feature scope and requirements before coding
2. **Database First**: Start with the data model and migrations
3. **Backend Before Frontend**: Implement and test the API before building the UI
4. **Layer by Layer**: Repository → Service → Controller → Routes → Frontend
5. **Test as You Go**: Write tests for each component and service
6. **Document Your Work**: Create clear documentation for other developers
```

By following this structured approach, you've implemented a complete feature with proper separation of concerns across the frontend and backend.