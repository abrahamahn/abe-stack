import { useCallback, useEffect, useState } from 'react';

import { PageContent } from '../../layouts/PageContent';
import { socialService } from '../../services/social';
import { CommentSection } from '../social/CommentSection';
import { CreatePostForm } from '../social/CreatePostForm';
import { PostCard } from '../social/PostCard';
import { UserProfileCard } from '../social/UserProfileCard';

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

export function SocialPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await socialService.getFeed('home', undefined, offset);
      if (offset === 0) {
        setPosts(response.posts);
      } else {
        setPosts((prev) => [...prev, ...response.posts]);
      }
      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [offset]);

  const fetchSuggestedUsers = useCallback(() => {
    try {
      // This is a mock implementation - in a real app, you'd have an API endpoint for this
      // For now, we'll create some dummy users
      const dummyUsers: User[] = [
        {
          id: '1',
          username: 'johndoe',
          displayName: 'John Doe',
          avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
          bio: 'Software developer and tech enthusiast',
          followersCount: 245,
          followingCount: 123,
          postsCount: 42,
          isFollowing: false,
        },
        {
          id: '2',
          username: 'janedoe',
          displayName: 'Jane Doe',
          avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
          bio: 'UX Designer | Coffee lover',
          followersCount: 532,
          followingCount: 231,
          postsCount: 87,
          isFollowing: false,
        },
        {
          id: '3',
          username: 'alexsmith',
          displayName: 'Alex Smith',
          avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
          bio: 'Photographer and traveler',
          followersCount: 1245,
          followingCount: 342,
          postsCount: 156,
          isFollowing: false,
        },
      ];

      setSuggestedUsers(dummyUsers);
    } catch (error) {
      console.error('Error fetching suggested users:', error);
    }
  }, []);

  useEffect(() => {
    void fetchFeed();
    void fetchSuggestedUsers();
  }, [fetchFeed, fetchSuggestedUsers]);

  const handleLoadMore = () => {
    setOffset((prev) => prev + 10);
    void fetchFeed();
  };

  const handleRefresh = () => {
    setOffset(0);
    void fetchFeed();
    void fetchSuggestedUsers();
  };

  const handleCommentClick = (postId: string) => {
    setActiveCommentPostId(postId);
  };

  return (
    <PageContent title="Social Feed" description="Connect with friends and share your thoughts.">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: '24px',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '20px 0',
        }}
      >
        <div>
          <CreatePostForm onPostCreated={handleRefresh} />

          {posts.length === 0 && !isLoading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
              }}
            >
              <h3>No posts yet</h3>
              <p>Create a post or follow users to see their posts in your feed.</p>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onCommentClick={handleCommentClick}
                  onRefresh={handleRefresh}
                />
              ))}

              {hasMore && (
                <div
                  style={{
                    textAlign: 'center',
                    marginTop: '24px',
                    marginBottom: '24px',
                  }}
                >
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: 'var(--accent)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      opacity: isLoading ? 0.7 : 1,
                    }}
                  >
                    {isLoading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              padding: '16px',
              marginBottom: '24px',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Suggested Users</h3>
            {suggestedUsers.map((user) => (
              <UserProfileCard key={user.id} user={user} />
            ))}
          </div>

          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              padding: '16px',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>About</h3>
            <p>
              This social feed demonstrates the integration of server-side social features with the
              client-side UI.
            </p>
            <p>Features include:</p>
            <ul>
              <li>Creating posts with text and media</li>
              <li>Liking and commenting on posts</li>
              <li>Following other users</li>
              <li>Real-time updates</li>
            </ul>
          </div>
        </div>
      </div>

      {activeCommentPostId && (
        <CommentSection postId={activeCommentPostId} onClose={() => setActiveCommentPostId(null)} />
      )}
    </PageContent>
  );
}
