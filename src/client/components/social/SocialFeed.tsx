import React, { useEffect, useState } from "react";

import { formatRelativeTime } from "../../helpers/formatters";
import { socialFeedStyles } from "../../styles";
import { mergeStyles } from "../../utils/styleUtils";
import AudioPlayer from "../media/AudioPlayer";
import ImageGallery from "../media/ImageGallery";
import VideoPlayer from "../media/VideoPlayer";

// Types for different media content
interface TrackData {
  id: string;
  title: string;
  artist: string;
  coverArt: string;
  audioUrl: string;
}

interface ImageData {
  src: string;
  width: number;
  height: number;
  alt?: string;
}

interface VideoData {
  sources: Array<{
    src: string;
    quality: string;
    type: string;
  }>;
  poster?: string;
  title?: string;
  duration?: number;
}

interface PostData {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  mediaType?: "image" | "video" | "audio" | "carousel";
  track?: TrackData;
  image?: ImageData;
  video?: VideoData;
  carousel?: ImageData[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount?: number;
  isLiked: boolean;
  tags?: string[];
  location?: string;
  createdAt: string;
}

interface SocialFeedProps {
  initialPosts?: PostData[];
  onLikePost?: (postId: string, isLiked: boolean) => void;
  onCommentPost?: (postId: string, comment: string) => void;
  onSharePost?: (postId: string) => void;
  onViewPost?: (postId: string) => void;
}

const SocialFeed: React.FC<SocialFeedProps> = ({
  initialPosts = [],
  onLikePost,
  onCommentPost,
  onSharePost,
  onViewPost,
}) => {
  const [posts, setPosts] = useState<PostData[]>(initialPosts);
  const [newComment, setNewComment] = useState<string>("");
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [expandedCaption, setExpandedCaption] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, you would fetch posts from an API
    if (initialPosts.length === 0) {
      // Mock data for demonstration
      const mockPosts: PostData[] = [
        {
          id: "1",
          userId: "user1",
          username: "JohnDoe",
          userAvatar: "/images/avatars/user1.jpg",
          content:
            "Check out this awesome new track I discovered! #newmusic #recommended",
          mediaType: "audio",
          track: {
            id: "track1",
            title: "Awesome Track",
            artist: "Amazing Artist",
            coverArt: "/images/covers/track1.jpg",
            audioUrl: "/audio/track1.mp3",
          },
          likesCount: 42,
          commentsCount: 7,
          sharesCount: 3,
          isLiked: false,
          tags: ["newmusic", "recommended"],
          createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        },
        {
          id: "2",
          userId: "user2",
          username: "TravelLover",
          userAvatar: "/images/avatars/user2.jpg",
          content:
            "Amazing view from my hotel this morning! #travel #vacation #sunrise",
          mediaType: "image",
          image: {
            src: "/images/posts/travel1.jpg",
            width: 1080,
            height: 1350,
            alt: "Sunrise view from hotel balcony",
          },
          likesCount: 128,
          commentsCount: 14,
          sharesCount: 5,
          isLiked: true,
          location: "Bali, Indonesia",
          tags: ["travel", "vacation", "sunrise"],
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        },
        {
          id: "3",
          userId: "user3",
          username: "FoodieChef",
          userAvatar: "/images/avatars/user3.jpg",
          content:
            "Made this delicious pasta dish yesterday! Swipe to see the process 👨‍🍳 #homemade #cooking #pasta",
          mediaType: "carousel",
          carousel: [
            {
              src: "/images/posts/food1.jpg",
              width: 1080,
              height: 1080,
              alt: "Finished pasta dish",
            },
            {
              src: "/images/posts/food2.jpg",
              width: 1080,
              height: 1080,
              alt: "Cooking process",
            },
            {
              src: "/images/posts/food3.jpg",
              width: 1080,
              height: 1080,
              alt: "Ingredients",
            },
          ],
          likesCount: 89,
          commentsCount: 9,
          sharesCount: 2,
          isLiked: false,
          tags: ["homemade", "cooking", "pasta"],
          createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        },
        {
          id: "4",
          userId: "user4",
          username: "FilmCreator",
          userAvatar: "/images/avatars/user4.jpg",
          content:
            "Just finished editing my latest short film! Check it out and let me know what you think 🎬 #shortfilm #filmmaker #cinematography",
          mediaType: "video",
          video: {
            sources: [
              {
                src: "/videos/film1.mp4",
                quality: "720p",
                type: "video/mp4",
              },
              {
                src: "/videos/film1-480p.mp4",
                quality: "480p",
                type: "video/mp4",
              },
            ],
            poster: "/images/posts/film1-poster.jpg",
            title: "My Short Film",
          },
          likesCount: 215,
          commentsCount: 32,
          sharesCount: 18,
          viewsCount: 1240,
          isLiked: false,
          tags: ["shortfilm", "filmmaker", "cinematography"],
          createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        },
      ];

      setPosts(mockPosts);
    }
  }, [initialPosts]);

  const handleLike = (postId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const newIsLiked = !post.isLiked;
          const likeDelta = newIsLiked ? 1 : -1;

          if (onLikePost) {
            onLikePost(postId, newIsLiked);
          }

          return {
            ...post,
            isLiked: newIsLiked,
            likesCount: post.likesCount + likeDelta,
          };
        }
        return post;
      }),
    );
  };

  const handleComment = (postId: string) => {
    if (!newComment.trim()) return;

    if (onCommentPost) {
      onCommentPost(postId, newComment);
    }

    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            commentsCount: post.commentsCount + 1,
          };
        }
        return post;
      }),
    );

    setNewComment("");
    setActivePostId(null);
  };

  const handleShare = (postId: string) => {
    if (onSharePost) {
      onSharePost(postId);
    }

    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            sharesCount: post.sharesCount + 1,
          };
        }
        return post;
      }),
    );
  };

  const handleView = (postId: string) => {
    if (onViewPost) {
      onViewPost(postId);
    }
  };

  const toggleCaption = (postId: string) => {
    setExpandedCaption(expandedCaption === postId ? null : postId);
  };

  const renderTags = (tags?: string[]) => {
    if (!tags || tags.length === 0) return null;

    return (
      <div className="post-tags">
        {tags.map((tag) => (
          <a
            key={tag}
            href={`/tag/${tag}`}
            className="tag"
            onClick={(e) => {
              e.preventDefault();
              // Handle tag click
            }}
          >
            #{tag}
          </a>
        ))}
      </div>
    );
  };

  const renderMediaContent = (post: PostData) => {
    switch (post.mediaType) {
      case "audio":
        if (!post.track) return null;
        return (
          <div className="post-media post-audio">
            <AudioPlayer
              trackUrl={post.track.audioUrl}
              trackTitle={post.track.title}
              artistName={post.track.artist}
              coverArtUrl={post.track.coverArt}
              onPlay={() => handleView(post.id)}
            />
          </div>
        );

      case "image":
        if (!post.image) return null;
        return (
          <div className="post-media post-image">
            <ImageGallery
              images={[post.image]}
              showThumbnails={false}
              showNavigation={false}
              aspectRatio={post.image.width / post.image.height}
              onClick={() => handleView(post.id)}
            />
          </div>
        );

      case "video":
        if (!post.video) return null;
        return (
          <div className="post-media post-video">
            <VideoPlayer
              sources={post.video.sources}
              poster={post.video.poster}
              title={post.video.title}
              onPlay={() => handleView(post.id)}
            />
            {post.viewsCount !== undefined && (
              <div className="view-count">
                {post.viewsCount.toLocaleString()} views
              </div>
            )}
          </div>
        );

      case "carousel":
        if (!post.carousel || post.carousel.length === 0) return null;
        return (
          <div className="post-media post-carousel">
            <ImageGallery
              images={post.carousel}
              showThumbnails={false}
              aspectRatio={post.carousel[0].width / post.carousel[0].height}
              onClick={() => handleView(post.id)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={socialFeedStyles.socialFeed as React.CSSProperties}>
      <div style={socialFeedStyles.feedHeader as React.CSSProperties}>
        <h2 style={socialFeedStyles.feedTitle as React.CSSProperties}>Feed</h2>
        <div style={socialFeedStyles.feedFilter as React.CSSProperties}>
          <button
            style={mergeStyles(
              socialFeedStyles.filterButton as React.CSSProperties,
              socialFeedStyles.filterButtonActive as React.CSSProperties,
            )}
          >
            For You
          </button>
          <button
            style={socialFeedStyles.filterButton as React.CSSProperties}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "var(--hover)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "var(--background2)";
            }}
          >
            Following
          </button>
          <button
            style={socialFeedStyles.filterButton as React.CSSProperties}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "var(--hover)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "var(--background2)";
            }}
          >
            Popular
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div style={socialFeedStyles.emptyFeed as React.CSSProperties}>
          No posts to display
        </div>
      ) : (
        <div style={socialFeedStyles.postList as React.CSSProperties}>
          {posts.map((post) => (
            <div
              key={post.id}
              style={socialFeedStyles.postCard as React.CSSProperties}
            >
              <div style={socialFeedStyles.postHeader as React.CSSProperties}>
                <div style={socialFeedStyles.postAvatar as React.CSSProperties}>
                  <img
                    src={post.userAvatar}
                    alt={`${post.username}'s avatar`}
                    style={
                      socialFeedStyles.postAvatarImg as React.CSSProperties
                    }
                  />
                </div>
                <div
                  style={socialFeedStyles.postUserInfo as React.CSSProperties}
                >
                  <h3
                    style={socialFeedStyles.postUsername as React.CSSProperties}
                  >
                    {post.username}
                  </h3>
                  <p style={socialFeedStyles.postTime as React.CSSProperties}>
                    {formatRelativeTime(new Date(post.createdAt))}
                    {post.location && ` • ${post.location}`}
                  </p>
                </div>
                <button
                  style={socialFeedStyles.postOptions as React.CSSProperties}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "var(--hover)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  ⋮
                </button>
              </div>

              {post.mediaType && (
                <div style={socialFeedStyles.postMedia as React.CSSProperties}>
                  {renderMediaContent(post)}
                </div>
              )}

              <div style={socialFeedStyles.postContent as React.CSSProperties}>
                {post.content.length > 150 && expandedCaption !== post.id ? (
                  <>
                    {post.content.substring(0, 150)}...{" "}
                    <button
                      onClick={() => toggleCaption(post.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-color2)",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      more
                    </button>
                  </>
                ) : (
                  <>
                    {post.content}
                    {post.content.length > 150 && (
                      <button
                        onClick={() => toggleCaption(post.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-color2)",
                          cursor: "pointer",
                          padding: 0,
                          marginLeft: "5px",
                        }}
                      >
                        less
                      </button>
                    )}
                  </>
                )}

                {post.tags && post.tags.length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    {renderTags(post.tags)}
                  </div>
                )}
              </div>

              <div style={socialFeedStyles.postActions as React.CSSProperties}>
                <button
                  style={mergeStyles(
                    socialFeedStyles.postAction as React.CSSProperties,
                    post.isLiked
                      ? (socialFeedStyles.postActionLiked as React.CSSProperties)
                      : {},
                  )}
                  onClick={() => handleLike(post.id)}
                  onMouseOver={(e) => {
                    if (!post.isLiked) {
                      e.currentTarget.style.background = "var(--hover)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!post.isLiked) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {post.isLiked ? "❤️" : "🤍"} {post.likesCount}
                </button>

                <button
                  style={socialFeedStyles.postAction as React.CSSProperties}
                  onClick={() =>
                    setActivePostId(activePostId === post.id ? null : post.id)
                  }
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "var(--hover)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  💬 {post.commentsCount}
                </button>

                <button
                  style={socialFeedStyles.postAction as React.CSSProperties}
                  onClick={() => handleShare(post.id)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "var(--hover)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  🔄 {post.sharesCount}
                </button>

                {post.viewsCount && (
                  <span
                    style={{
                      marginLeft: "auto",
                      color: "var(--text-color2)",
                      fontSize: "0.9rem",
                    }}
                  >
                    👁️ {post.viewsCount}
                  </span>
                )}
              </div>

              {activePostId === post.id && (
                <div
                  style={{
                    padding: "10px 15px",
                    display: "flex",
                    gap: "10px",
                    borderTop: "1px solid var(--separator)",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "20px",
                      border: "1px solid var(--separator)",
                      background: "var(--background3)",
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleComment(post.id);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleComment(post.id)}
                    disabled={!newComment.trim()}
                    style={{
                      padding: "8px 15px",
                      borderRadius: "20px",
                      border: "none",
                      background: newComment.trim()
                        ? "var(--blue)"
                        : "var(--gray4)",
                      color: newComment.trim() ? "white" : "var(--text-color3)",
                      cursor: newComment.trim() ? "pointer" : "not-allowed",
                    }}
                  >
                    Post
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        style={socialFeedStyles.loadMore as React.CSSProperties}
        onClick={() => {
          // In a real app, this would load more posts
          console.log("Load more posts");
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "var(--hover)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "var(--background2)";
        }}
      >
        Load More
      </button>
    </div>
  );
};

export default SocialFeed;
