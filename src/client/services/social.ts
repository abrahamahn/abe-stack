interface User {
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

interface FeedResponse {
  posts: Post[];
  hasMore: boolean;
}

interface CommentsResponse {
  comments: Comment[];
  hasMore: boolean;
}

class SocialService {
  private static instance: SocialService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = "/api";
  }

  public static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  // User-related methods
  async getUserProfile(userId: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }
    return response.json() as Promise<User>;
  }

  async followUser(userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/follow`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to follow user");
    }
  }

  async unfollowUser(userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/unfollow`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to unfollow user");
    }
  }

  // Post-related methods
  async getFeed(
    type: "home" | "profile" | "explore",
    userId?: string,
    offset: number = 0,
  ): Promise<FeedResponse> {
    const url = new URL(`${this.baseUrl}/feed`);
    url.searchParams.append("type", type);
    if (userId) {
      url.searchParams.append("userId", userId);
    }
    if (offset > 0) {
      url.searchParams.append("offset", offset.toString());
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error("Failed to fetch feed");
    }
    return response.json() as Promise<FeedResponse>;
  }

  async createPost(content: string, media?: File): Promise<Post> {
    const formData = new FormData();
    formData.append("content", content);
    if (media) {
      formData.append("media", media);
    }

    const response = await fetch(`${this.baseUrl}/posts`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error("Failed to create post");
    }
    return response.json() as Promise<Post>;
  }

  async likePost(postId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/posts/${postId}/like`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to like post");
    }
  }

  async unlikePost(postId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/posts/${postId}/unlike`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to unlike post");
    }
  }

  async sharePost(postId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/posts/${postId}/share`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to share post");
    }
  }

  // Comment-related methods
  async getComments(
    postId: string,
    offset: number = 0,
  ): Promise<CommentsResponse> {
    const url = new URL(`${this.baseUrl}/posts/${postId}/comments`);
    if (offset > 0) {
      url.searchParams.append("offset", offset.toString());
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error("Failed to fetch comments");
    }
    return response.json() as Promise<CommentsResponse>;
  }

  async createComment(postId: string, content: string): Promise<Comment> {
    const response = await fetch(`${this.baseUrl}/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new Error("Failed to create comment");
    }
    return response.json() as Promise<Comment>;
  }

  async likeComment(commentId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/comments/${commentId}/like`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to like comment");
    }
  }

  async unlikeComment(commentId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/comments/${commentId}/unlike`,
      {
        method: "POST",
      },
    );
    if (!response.ok) {
      throw new Error("Failed to unlike comment");
    }
  }

  async replyToComment(commentId: string, content: string): Promise<Comment> {
    const response = await fetch(
      `${this.baseUrl}/comments/${commentId}/replies`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      },
    );
    if (!response.ok) {
      throw new Error("Failed to create reply");
    }
    return response.json() as Promise<Comment>;
  }
}

export const socialService = SocialService.getInstance();
