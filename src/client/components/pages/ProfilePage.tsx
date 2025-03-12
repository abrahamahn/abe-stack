import React, { useState, useEffect } from 'react';
import { useClientEnvironment } from '../../services/ClientEnvironment';
import { PageContent } from '../layouts/PageContent';
import { PostCard } from '../social/PostCard';
import { CommentSection } from '../social/CommentSection';
import { socialService } from '../../services/social';

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

// Profile page styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '30px',
    marginTop: '20px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  avatar: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: 'var(--blue)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '36px',
    fontWeight: 'bold'
  },
  name: {
    margin: '0 0 5px 0',
    color: 'var(--text-primary)'
  },
  username: {
    color: 'var(--text-secondary)'
  },
  stats: {
    marginTop: '10px',
    display: 'flex',
    gap: '15px',
    color: 'var(--text-primary)'
  },
  editButton: {
    marginLeft: 'auto',
    padding: '8px 16px',
    backgroundColor: 'var(--blue)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  card: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: 'var(--shadow)',
    border: '1px solid var(--border-color)'
  },
  sectionTitle: {
    margin: '0 0 15px 0',
    color: 'var(--text-primary)'
  },
  bio: {
    margin: '0',
    lineHeight: '1.6',
    color: 'var(--text-primary)'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr',
    rowGap: '15px',
    color: 'var(--text-primary)'
  },
  detailLabel: {
    fontWeight: 'bold'
  },
  activityItem: {
    padding: '15px',
    backgroundColor: 'var(--surface)',
    borderRadius: '8px'
  },
  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  activityTitle: {
    fontWeight: 'bold',
    color: 'var(--text-primary)'
  },
  activityTime: {
    color: 'var(--text-secondary)',
    fontSize: '14px'
  },
  activityContent: {
    margin: '10px 0 0 0',
    color: 'var(--text-primary)'
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px'
  }
};

export function ProfilePage() {
  const environment = useClientEnvironment();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'media'>('posts');
  
  // Get userId from URL
  // Extract userId from the current URL path
  const currentUrl = window.location.pathname;
  const userId = currentUrl.startsWith('/profile/') 
    ? currentUrl.substring('/profile/'.length) 
    : 'current'; // Default to 'current' if no userId in URL
  
  useEffect(() => {
    fetchUserProfile();
    fetchUserPosts();
  }, [userId]);
  
  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      const userData = await socialService.getUserProfile(userId);
      setUser(userData);
      setIsFollowing(userData.isFollowing);
      setFollowersCount(userData.followersCount);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchUserPosts = async () => {
    try {
      const response = await socialService.getFeed('profile', userId);
      setPosts(response.posts);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    }
  };
  
  const handleFollowToggle = async () => {
    if (!user) return;
    
    try {
      if (isFollowing) {
        await socialService.unfollowUser(user.id);
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        await socialService.followUser(user.id);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };
  
  const handleCommentClick = (postId: string) => {
    setActiveCommentPostId(postId);
  };
  
  const handleRefresh = () => {
    fetchUserPosts();
  };
  
  const filteredPosts = activeTab === 'posts' 
    ? posts 
    : posts.filter(post => post.media);
  
  if (isLoading) {
    return (
      <PageContent title="Profile" description="Loading user profile...">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Loading profile...
        </div>
      </PageContent>
    );
  }
  
  if (!user) {
    return (
      <PageContent title="Profile Not Found" description="User profile not found">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          User not found
        </div>
      </PageContent>
    );
  }
  
  return (
    <PageContent
      title={`${user.displayName}'s Profile`}
      description={`View ${user.displayName}'s profile and posts`}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 0' }}>
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img 
              src={user.avatar || '/default-avatar.png'} 
              alt={user.displayName} 
              style={{ 
                width: '120px', 
                height: '120px', 
                borderRadius: '50%', 
                marginRight: '24px',
                objectFit: 'cover'
              }} 
            />
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 8px 0' }}>{user.displayName}</h2>
              <div style={{ color: '#666', marginBottom: '12px' }}>@{user.username}</div>
              <div style={{ marginBottom: '16px' }}>{user.bio}</div>
              <div style={{ display: 'flex', gap: '24px', color: '#666' }}>
                <div><strong>{user.postsCount}</strong> posts</div>
                <div><strong>{followersCount}</strong> followers</div>
                <div><strong>{user.followingCount}</strong> following</div>
              </div>
            </div>
            <div>
              <button 
                onClick={handleFollowToggle}
                style={{ 
                  padding: '10px 20px',
                  backgroundColor: isFollowing ? 'white' : 'var(--accent)',
                  color: isFollowing ? 'var(--accent)' : 'white',
                  border: isFollowing ? '1px solid var(--accent)' : 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            </div>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex',
          borderBottom: '1px solid #e0e0e0',
          marginBottom: '24px'
        }}>
          <button 
            onClick={() => setActiveTab('posts')}
            style={{ 
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'posts' ? '2px solid var(--accent)' : 'none',
              color: activeTab === 'posts' ? 'var(--accent)' : 'inherit',
              fontWeight: activeTab === 'posts' ? 'bold' : 'normal',
              cursor: 'pointer'
            }}
          >
            Posts
          </button>
          <button 
            onClick={() => setActiveTab('media')}
            style={{ 
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'media' ? '2px solid var(--accent)' : 'none',
              color: activeTab === 'media' ? 'var(--accent)' : 'inherit',
              fontWeight: activeTab === 'media' ? 'bold' : 'normal',
              cursor: 'pointer'
            }}
          >
            Media
          </button>
        </div>
        
        {filteredPosts.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3>No {activeTab} yet</h3>
            <p>{activeTab === 'posts' ? 'User has not created any posts yet.' : 'User has not shared any media yet.'}</p>
          </div>
        ) : (
          <>
            {filteredPosts.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                onCommentClick={handleCommentClick}
                onRefresh={handleRefresh}
              />
            ))}
          </>
        )}
      </div>
      
      {activeCommentPostId && (
        <CommentSection 
          postId={activeCommentPostId} 
          onClose={() => setActiveCommentPostId(null)} 
        />
      )}
    </PageContent>
  );
} 