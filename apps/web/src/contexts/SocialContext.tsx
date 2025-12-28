import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { socialService } from '../services/social';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
}

interface Post {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  media?: {
    type: 'image' | 'video' | 'audio';
    url: string;
    thumbnail?: string;
  };
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  createdAt: string;
}

interface SocialContextType {
  currentUser: User | null;
  feed: Post[];
  isLoading: boolean;
  error: string | null;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  sharePost: (postId: string) => Promise<void>;
  createPost: (content: string, media?: File) => Promise<void>;
  refreshFeed: () => Promise<void>;
}

const SocialContext = createContext<SocialContextType | null>(null);

export const useSocial = () => {
  const context = useContext(SocialContext);
  if (!context) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
};

interface SocialProviderProps {
  children: React.ReactNode;
}

export const SocialProvider: React.FC<SocialProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [feed, setFeed] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshFeed = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await socialService.getFeed('home');
      setFeed(response.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh feed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initializeSocial = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const user = await socialService.getUserProfile('current');
      setCurrentUser(user);
      await refreshFeed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize social');
    } finally {
      setIsLoading(false);
    }
  }, [refreshFeed]);

  useEffect(() => {
    void initializeSocial();
  }, [initializeSocial]);

  const followUser = async (userId: string) => {
    try {
      setError(null);
      await socialService.followUser(userId);
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          followingCount: currentUser.followingCount + 1,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to follow user');
      throw err;
    }
  };

  const unfollowUser = async (userId: string) => {
    try {
      setError(null);
      await socialService.unfollowUser(userId);
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          followingCount: currentUser.followingCount - 1,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unfollow user');
      throw err;
    }
  };

  const likePost = async (postId: string) => {
    try {
      setError(null);
      await socialService.likePost(postId);
      setFeed((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, isLiked: true, likesCount: post.likesCount + 1 } : post,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to like post');
      throw err;
    }
  };

  const unlikePost = async (postId: string) => {
    try {
      setError(null);
      await socialService.unlikePost(postId);
      setFeed((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, isLiked: false, likesCount: post.likesCount - 1 } : post,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlike post');
      throw err;
    }
  };

  const sharePost = async (postId: string) => {
    try {
      setError(null);
      await socialService.sharePost(postId);
      setFeed((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, sharesCount: post.sharesCount + 1 } : post,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share post');
      throw err;
    }
  };

  const createPost = async (content: string, media?: File) => {
    try {
      setError(null);
      const newPost = await socialService.createPost(content, media);
      setFeed((prev) => [newPost, ...prev]);
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          postsCount: currentUser.postsCount + 1,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
      throw err;
    }
  };

  const value = {
    currentUser,
    feed,
    isLoading,
    error,
    followUser,
    unfollowUser,
    likePost,
    unlikePost,
    sharePost,
    createPost,
    refreshFeed,
  };

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
};
