import React, { useCallback, useEffect, useRef, useState } from "react";

import { MediaPlayer } from "../media/mediaPlayer";

interface Post {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  media?: {
    type: "image" | "video" | "audio";
    url: string;
    thumbnail?: string;
  };
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  createdAt: string;
}

// Add API response type definitions
interface FeedResponse {
  posts: Post[];
  hasMore: boolean;
}

interface FeedProps {
  type: "home" | "profile" | "explore";
  userId?: string;
  onLoadMore?: () => Promise<void>;
  className?: string;
}

export const Feed: React.FC<FeedProps> = ({
  type,
  userId,
  onLoadMore,
  className,
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // TODO: Replace with actual API call
      const response = await fetch(
        `/api/feed?type=${type}${userId ? `&userId=${userId}` : ""}`,
      );
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data = (await response.json()) as FeedResponse;
      setPosts(data.posts);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setIsLoading(false);
    }
  }, [type, userId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    try {
      setIsLoading(true);
      await onLoadMore?.();
      // TODO: Replace with actual API call
      const response = await fetch(
        `/api/feed?type=${type}${userId ? `&userId=${userId}` : ""}&offset=${posts.length}`,
      );
      if (!response.ok) throw new Error("Failed to fetch more posts");
      const data = (await response.json()) as FeedResponse;
      setPosts((prev) => [...prev, ...data.posts]);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load more posts",
      );
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, onLoadMore, posts.length, type, userId]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts, type, userId]);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          void loadMore();
        }
      },
      { threshold: 0.5 },
    );

    if (lastPostRef.current) {
      observer.current.observe(lastPostRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loadMore, hasMore, isLoading]);

  const handleLike = async (postId: string) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to like post");

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked: !post.isLiked,
                likesCount: post.isLiked
                  ? post.likesCount - 1
                  : post.likesCount + 1,
              }
            : post,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to like post");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "16px",
      maxWidth: "600px",
      margin: "0 auto",
      padding: "16px",
    },
    post: {
      backgroundColor: "#fff",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      overflow: "hidden",
    },
    postHeader: {
      display: "flex",
      alignItems: "center",
      padding: "12px",
      gap: "12px",
    },
    avatar: {
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      objectFit: "cover" as const,
    },
    userInfo: {
      flex: 1,
    },
    username: {
      fontSize: "16px",
      fontWeight: 600,
      color: "#1a1a1a",
      margin: 0,
    },
    timestamp: {
      fontSize: "14px",
      color: "#666",
      margin: "4px 0 0",
    },
    content: {
      padding: "0 12px 12px",
      fontSize: "16px",
      lineHeight: "1.5",
      color: "#333",
    },
    media: {
      width: "100%",
      maxHeight: "600px",
      objectFit: "cover" as const,
    },
    actions: {
      display: "flex",
      padding: "12px",
      gap: "16px",
      borderTop: "1px solid #eee",
    },
    actionButton: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: "none",
      border: "none",
      color: "#666",
      cursor: "pointer",
      padding: "4px 8px",
      borderRadius: "4px",
      transition: "background-color 0.2s",
      "&:hover": {
        backgroundColor: "#f5f5f5",
      },
    },
    actionButtonLiked: {
      color: "#e91e63",
    },
    actionCount: {
      fontSize: "14px",
    },
    loading: {
      textAlign: "center" as const,
      padding: "24px",
      color: "#666",
    },
    error: {
      color: "#d32f2f",
      textAlign: "center" as const,
      padding: "16px",
    },
  };

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  return (
    <div style={styles.container} className={className}>
      {posts.map((post, index) => (
        <div
          key={post.id}
          ref={index === posts.length - 1 ? lastPostRef : undefined}
          style={styles.post}
        >
          <div style={styles.postHeader}>
            <img
              src={post.userAvatar}
              alt={post.username}
              style={styles.avatar}
            />
            <div style={styles.userInfo}>
              <p style={styles.username}>{post.username}</p>
              <p style={styles.timestamp}>{formatDate(post.createdAt)}</p>
            </div>
          </div>

          <p style={styles.content}>{post.content}</p>

          {post.media &&
            (post.media.type === "image" ? (
              <img src={post.media.url} alt="Post media" style={styles.media} />
            ) : (
              <MediaPlayer
                src={post.media.url}
                type={post.media.type}
                poster={post.media.thumbnail}
              />
            ))}

          <div style={styles.actions}>
            <button
              style={{
                ...styles.actionButton,
                ...(post.isLiked && styles.actionButtonLiked),
              }}
              onClick={() => void handleLike(post.id)}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#f5f5f5")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              {post.isLiked ? "❤️" : "🤍"}
              <span style={styles.actionCount}>{post.likesCount}</span>
            </button>
            <button
              style={styles.actionButton}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#f5f5f5")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              💬
              <span style={styles.actionCount}>{post.commentsCount}</span>
            </button>
            <button
              style={styles.actionButton}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#f5f5f5")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              🔄
              <span style={styles.actionCount}>{post.sharesCount}</span>
            </button>
          </div>
        </div>
      ))}

      {isLoading && <div style={styles.loading}>Loading more posts...</div>}
    </div>
  );
};
