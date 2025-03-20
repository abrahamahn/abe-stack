import React, { useCallback, useEffect, useRef, useState } from "react";

interface Comment {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
  replies?: Comment[];
}

// Define API response interfaces
interface CommentsResponse {
  comments: Comment[];
  hasMore: boolean;
}

interface CommentsProps {
  postId: string;
  onLoadMore?: () => Promise<void>;
  className?: string;
}

export const Comments: React.FC<CommentsProps> = ({
  postId,
  onLoadMore,
  className,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastCommentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // TODO: Replace with actual API call
      const response = await fetch(`/api/posts/${postId}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      const data = (await response.json()) as CommentsResponse;
      setComments(data.comments);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    try {
      setIsLoading(true);
      await onLoadMore?.();
      // TODO: Replace with actual API call
      const response = await fetch(
        `/api/posts/${postId}/comments?offset=${comments.length}`,
      );
      if (!response.ok) throw new Error("Failed to fetch more comments");
      const data = (await response.json()) as CommentsResponse;
      setComments((prev) => [...prev, ...data.comments]);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load more comments",
      );
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, onLoadMore, postId, comments.length]);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          void loadMore();
        }
      },
      { threshold: 0.5 },
    );

    if (lastCommentRef.current) {
      observer.current.observe(lastCommentRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [hasMore, isLoading, loadMore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      // TODO: Replace with actual API call
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!response.ok) throw new Error("Failed to post comment");

      const comment = (await response.json()) as Comment;
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to like comment");

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                isLiked: !comment.isLiked,
                likesCount: comment.isLiked
                  ? comment.likesCount - 1
                  : comment.likesCount + 1,
              }
            : comment,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to like comment");
    }
  };

  // Void-returning wrapper for handleSubmit
  const handleSubmitWrapper = (e: React.FormEvent) => {
    void handleSubmit(e);
  };

  // Void-returning wrapper for handleLike
  const handleLikeWrapper = (commentId: string) => {
    void handleLike(commentId);
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
    },
    comment: {
      display: "flex",
      gap: "12px",
      padding: "12px",
      backgroundColor: "#f8f9fa",
      borderRadius: "8px",
    },
    avatar: {
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      objectFit: "cover" as const,
    },
    content: {
      flex: 1,
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "4px",
    },
    username: {
      fontSize: "14px",
      fontWeight: 600,
      color: "#1a1a1a",
    },
    timestamp: {
      fontSize: "12px",
      color: "#666",
    },
    text: {
      fontSize: "14px",
      lineHeight: "1.5",
      color: "#333",
      margin: "0 0 8px",
    },
    actions: {
      display: "flex",
      gap: "16px",
    },
    actionButton: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      background: "none",
      border: "none",
      color: "#666",
      cursor: "pointer",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "14px",
      transition: "background-color 0.2s",
      "&:hover": {
        backgroundColor: "#e9ecef",
      },
    },
    actionButtonLiked: {
      color: "#e91e63",
    },
    form: {
      display: "flex",
      gap: "12px",
      marginBottom: "16px",
    },
    textarea: {
      flex: 1,
      minHeight: "40px",
      maxHeight: "120px",
      padding: "8px 12px",
      border: "1px solid #ddd",
      borderRadius: "20px",
      fontSize: "14px",
      lineHeight: "1.5",
      resize: "none" as const,
      fontFamily: "inherit",
      "&:focus": {
        outline: "none",
        borderColor: "#2196f3",
      },
    },
    submitButton: {
      padding: "8px 16px",
      backgroundColor: "#2196f3",
      color: "#fff",
      border: "none",
      borderRadius: "20px",
      fontSize: "14px",
      fontWeight: 500,
      cursor: "pointer",
      transition: "background-color 0.2s",
      "&:hover": {
        backgroundColor: "#1976d2",
      },
      "&:disabled": {
        backgroundColor: "#ccc",
        cursor: "not-allowed",
      },
    },
    loading: {
      textAlign: "center" as const,
      padding: "16px",
      color: "#666",
    },
    error: {
      color: "#d32f2f",
      textAlign: "center" as const,
      padding: "16px",
    },
    replies: {
      marginLeft: "52px",
      borderLeft: "2px solid #e9ecef",
      paddingLeft: "12px",
    },
  };

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  return (
    <div style={styles.container} className={className}>
      <form onSubmit={handleSubmitWrapper} style={styles.form}>
        <textarea
          ref={textareaRef}
          value={newComment}
          onChange={(e) => {
            setNewComment(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          placeholder="Write a comment..."
          style={styles.textarea}
        />
        <button
          type="submit"
          style={{
            ...styles.submitButton,
            ...(isSubmitting && { opacity: 0.7 }),
          }}
          disabled={isSubmitting || !newComment.trim()}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#1976d2")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#2196f3")
          }
        >
          {isSubmitting ? "Posting..." : "Post"}
        </button>
      </form>

      {comments.map((comment, index) => (
        <div
          key={comment.id}
          ref={index === comments.length - 1 ? lastCommentRef : undefined}
          style={styles.comment}
        >
          <img
            src={comment.userAvatar}
            alt={comment.username}
            style={styles.avatar}
          />
          <div style={styles.content}>
            <div style={styles.header}>
              <span style={styles.username}>{comment.username}</span>
              <span style={styles.timestamp}>
                {formatDate(comment.createdAt)}
              </span>
            </div>
            <p style={styles.text}>{comment.content}</p>
            <div style={styles.actions}>
              <button
                style={{
                  ...styles.actionButton,
                  ...(comment.isLiked && styles.actionButtonLiked),
                }}
                onClick={() => handleLikeWrapper(comment.id)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#e9ecef")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                {comment.isLiked ? "❤️" : "🤍"}
                <span>{comment.likesCount}</span>
              </button>
              <button
                style={styles.actionButton}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#e9ecef")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                💬 Reply
              </button>
            </div>

            {comment.replies && comment.replies.length > 0 && (
              <div style={styles.replies}>
                {comment.replies.map((reply) => (
                  <div key={reply.id} style={styles.comment}>
                    <img
                      src={reply.userAvatar}
                      alt={reply.username}
                      style={styles.avatar}
                    />
                    <div style={styles.content}>
                      <div style={styles.header}>
                        <span style={styles.username}>{reply.username}</span>
                        <span style={styles.timestamp}>
                          {formatDate(reply.createdAt)}
                        </span>
                      </div>
                      <p style={styles.text}>{reply.content}</p>
                      <div style={styles.actions}>
                        <button
                          style={{
                            ...styles.actionButton,
                            ...(reply.isLiked && styles.actionButtonLiked),
                          }}
                          onClick={() => handleLikeWrapper(reply.id)}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#e9ecef")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          {reply.isLiked ? "❤️" : "🤍"}
                          <span>{reply.likesCount}</span>
                        </button>
                        <button
                          style={styles.actionButton}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#e9ecef")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          💬 Reply
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {isLoading && <div style={styles.loading}>Loading more comments...</div>}
    </div>
  );
};
