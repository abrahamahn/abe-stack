import React, { useState } from 'react';

import { useClientEnvironment } from '../../services/ClientEnvironment';
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

interface UserProfileCardProps {
  user: User;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({ user }) => {
  const environment = useClientEnvironment();
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);
  const [followersCount, setFollowersCount] = useState(user.followersCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollowToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (isFollowing) {
        await socialService.unfollowUser(user.id);
        setIsFollowing(false);
        setFollowersCount((prev) => prev - 1);
      } else {
        await socialService.followUser(user.id);
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToProfile = () => {
    environment.router.navigate(`/profile/${user.id}`);
  };

  return (
    <div
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
        backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img
          src={user.avatar || '/default-avatar.png'}
          alt={user.displayName}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            marginRight: '16px',
            objectFit: 'cover',
            cursor: 'pointer',
          }}
          onClick={navigateToProfile}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '1.2rem',
              cursor: 'pointer',
            }}
            onClick={navigateToProfile}
          >
            {user.displayName}
          </div>
          <div style={{ color: '#666', marginBottom: '8px' }}>@{user.username}</div>
          <div style={{ marginBottom: '12px' }}>{user.bio}</div>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              color: '#666',
              fontSize: '0.9rem',
            }}
          >
            <div>
              <strong>{user.postsCount}</strong> posts
            </div>
            <div>
              <strong>{followersCount}</strong> followers
            </div>
            <div>
              <strong>{user.followingCount}</strong> following
            </div>
          </div>
        </div>
        <div>
          <button
            onClick={() => void handleFollowToggle()}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: isFollowing ? 'white' : 'var(--accent)',
              color: isFollowing ? 'var(--accent)' : 'white',
              border: isFollowing ? '1px solid var(--accent)' : 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
          </button>
        </div>
      </div>
    </div>
  );
};
