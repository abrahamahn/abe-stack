import React, { useCallback, useEffect, useState } from "react";

import { formatDate } from "../../../server/infrastructure/utils/dateHelpers";
import { socialService } from "../../services/social";

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

interface CommentSectionProps {
  postId: string;
  onClose: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  onClose,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await socialService.getComments(postId, offset);
      if (offset === 0) {
        setComments(response.comments);
      } else {
        setComments((prev) => [...prev, ...response.comments]);
      }
      setHasMore(response.hasMore);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [postId, offset]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const handleLoadMore = () => {
    setOffset((prev) => prev + 10);
    void fetchComments();
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const comment = await socialService.createComment(postId, newComment);
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
    } catch (error) {
      console.error("Error creating comment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await socialService.unlikeComment(commentId);
      } else {
        await socialService.likeComment(commentId);
      }

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                isLiked: !isLiked,
                likesCount: isLiked
                  ? comment.likesCount - 1
                  : comment.likesCount + 1,
              }
            : comment,
        ),
      );
    } catch (error) {
      console.error("Error toggling comment like:", error);
    }
  };

  // Create void-returning wrapper functions for event handlers
  const handleLikeCommentWrapper = (commentId: string, isLiked: boolean) => {
    void handleLikeComment(commentId, isLiked);
  };

  const handleSubmitCommentWrapper = (e: React.FormEvent) => {
    void handleSubmitComment(e);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "400px",
        backgroundColor: "white",
        boxShadow: "-2px 0 10px rgba(0,0,0,0.1)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0 }}>Comments</h3>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: "1.5rem",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
        }}
      >
        {comments.length === 0 && !isLoading ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <div
                key={comment.id}
                style={{
                  marginBottom: "16px",
                  padding: "12px",
                  backgroundColor: "#f9f9f9",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <img
                    src={comment.userAvatar || "/default-avatar.png"}
                    alt={comment.username}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      marginRight: "8px",
                      objectFit: "cover",
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
                      {comment.username}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#666" }}>
                      {formatDate(comment.createdAt)}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "8px" }}>{comment.content}</div>

                <div style={{ display: "flex", alignItems: "center" }}>
                  <button
                    onClick={() =>
                      handleLikeCommentWrapper(comment.id, comment.isLiked)
                    }
                    style={{
                      background: "none",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      color: comment.isLiked ? "var(--accent)" : "inherit",
                      fontWeight: comment.isLiked ? "bold" : "normal",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span style={{ marginRight: "4px" }}>
                      {comment.isLiked ? "❤️" : "🤍"}
                    </span>
                    {comment.likesCount}
                  </button>
                </div>
              </div>
            ))}

            {hasMore && (
              <div style={{ textAlign: "center", marginTop: "16px" }}>
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "var(--accent)",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <form
        onSubmit={handleSubmitCommentWrapper}
        style={{
          padding: "16px",
          borderTop: "1px solid #e0e0e0",
          display: "flex",
        }}
      >
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid #e0e0e0",
            borderRadius: "20px",
            marginRight: "8px",
          }}
        />
        <button
          type="submit"
          disabled={!newComment.trim() || isLoading}
          style={{
            padding: "8px 16px",
            backgroundColor: "var(--accent)",
            color: "white",
            border: "none",
            borderRadius: "20px",
            cursor: "pointer",
            opacity: !newComment.trim() || isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? "..." : "Post"}
        </button>
      </form>
    </div>
  );
};
