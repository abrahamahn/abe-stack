import { useCallback, useState } from 'react';

import { useSocial, type User } from '../contexts/SocialContext';
import { socialService } from '../services/social';

interface UseSocialInteractionsProps {
  onError?: (error: Error) => void;
}

export type { User };
export const useSocialInteractions = ({ onError }: UseSocialInteractionsProps = {}) => {
  const { currentUser, refreshFeed } = useSocial();
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback(
    (error: Error) => {
      onError?.(error);
    },
    [onError],
  );

  const followUser = useCallback(
    async (userId: string) => {
      try {
        setIsLoading(true);
        await socialService.followUser(userId);
        await refreshFeed();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to follow user'));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshFeed, handleError],
  );

  const unfollowUser = useCallback(
    async (userId: string) => {
      try {
        setIsLoading(true);
        await socialService.unfollowUser(userId);
        await refreshFeed();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to unfollow user'));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshFeed, handleError],
  );

  const likePost = useCallback(
    async (postId: string) => {
      try {
        setIsLoading(true);
        await socialService.likePost(postId);
        await refreshFeed();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to like post'));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshFeed, handleError],
  );

  const unlikePost = useCallback(
    async (postId: string) => {
      try {
        setIsLoading(true);
        await socialService.unlikePost(postId);
        await refreshFeed();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to unlike post'));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshFeed, handleError],
  );

  const sharePost = useCallback(
    async (postId: string) => {
      try {
        setIsLoading(true);
        await socialService.sharePost(postId);
        await refreshFeed();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to share post'));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshFeed, handleError],
  );

  const createPost = useCallback(
    async (content: string, media?: File) => {
      try {
        setIsLoading(true);
        await socialService.createPost(content, media);
        await refreshFeed();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to create post'));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshFeed, handleError],
  );

  const createComment = useCallback(
    async (postId: string, content: string) => {
      try {
        setIsLoading(true);
        await socialService.createComment(postId, content);
        await refreshFeed();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to create comment'));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshFeed, handleError],
  );

  const likeComment = useCallback(
    async (commentId: string) => {
      try {
        setIsLoading(true);
        await socialService.likeComment(commentId);
        await refreshFeed();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to like comment'));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshFeed, handleError],
  );

  const unlikeComment = useCallback(
    async (commentId: string) => {
      try {
        setIsLoading(true);
        await socialService.unlikeComment(commentId);
        await refreshFeed();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to unlike comment'));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshFeed, handleError],
  );

  const replyToComment = useCallback(
    async (commentId: string, content: string) => {
      try {
        setIsLoading(true);
        await socialService.replyToComment(commentId, content);
        await refreshFeed();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to reply to comment'));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshFeed, handleError],
  );

  return {
    currentUser,
    isLoading,
    followUser,
    unfollowUser,
    likePost,
    unlikePost,
    sharePost,
    createPost,
    createComment,
    likeComment,
    unlikeComment,
    replyToComment,
  };
};
