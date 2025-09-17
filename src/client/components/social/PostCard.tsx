import React, { useState } from "react";

import { formatDate } from "@/client/helpers/formatters";

import { socialService } from "../../services/social";

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

interface PostCardProps {
  post: Post;
  onCommentClick: (postId: string) => void;
  onRefresh: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onCommentClick,
  onRefresh,
}) => {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleLikeToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (isLiked) {
        await socialService.unlikePost(post.id);
        setIsLiked(false);
        setLikesCount((prev) => prev - 1);
      } else {
        await socialService.likePost(post.id);
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await socialService.sharePost(post.id);
      onRefresh();
    } catch (error) {
      console.error("Error sharing post:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMedia = () => {
    if (!post.media) return null;

    switch (post.media.type) {
      case "image":
        return (
          <div style={{ marginTop: "12px" }}>
            <img
              src={post.media.url}
              alt="Post media"
              style={{
                maxWidth: "100%",
                borderRadius: "8px",
                maxHeight: "400px",
                objectFit: "cover",
              }}
            />
          </div>
        );
      case "video":
        return (
          <div style={{ marginTop: "12px" }}>
            <video
              src={post.media.url}
              controls
              poster={post.media.thumbnail}
              style={{
                maxWidth: "100%",
                borderRadius: "8px",
                maxHeight: "400px",
              }}
            />
          </div>
        );
      case "audio":
        return (
          <div style={{ marginTop: "12px" }}>
            <audio src={post.media.url} controls style={{ width: "100%" }} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px",
        backgroundColor: "white",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}
      >
        <img
          src={post.userAvatar || "/default-avatar.png"}
          alt={post.username}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            marginRight: "12px",
            objectFit: "cover",
          }}
        />
        <div>
          <div style={{ fontWeight: "bold" }}>{post.username}</div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>
            {formatDate(post.createdAt)}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "12px" }}>{post.content}</div>

      {renderMedia()}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "16px",
          padding: "8px 0",
          borderTop: "1px solid #f0f0f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            onClick={() => void handleLikeToggle()}
            style={{
              background: "none",
              border: "none",
              display: "flex",
              alignItems: "center",
              color: isLiked ? "var(--accent)" : "inherit",
              fontWeight: isLiked ? "bold" : "normal",
              cursor: "pointer",
            }}
          >
            <span style={{ marginRight: "4px" }}>{isLiked ? "❤️" : "🤍"}</span>
            {likesCount}
          </button>
        </div>

        <div>
          <button
            onClick={() => onCommentClick(post.id)}
            style={{
              background: "none",
              border: "none",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              marginRight: "16px",
            }}
          >
            <span style={{ marginRight: "4px" }}>💬</span>
            {post.commentsCount}
          </button>
        </div>

        <div>
          <button
            onClick={() => void handleShare()}
            style={{
              background: "none",
              border: "none",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <span style={{ marginRight: "4px" }}>🔄</span>
            {post.sharesCount}
          </button>
        </div>
      </div>
    </div>
  );
};
