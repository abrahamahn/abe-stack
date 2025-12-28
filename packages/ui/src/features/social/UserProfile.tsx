import React, { useCallback, useEffect, useState } from 'react';

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

interface UserProfileProps {
  userId: string;
  onFollow?: (userId: string) => Promise<void>;
  onUnfollow?: (userId: string) => Promise<void>;
  className?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  onFollow,
  onUnfollow,
  className,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user profile');
      const data = (await response.json()) as User;
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchUserProfile();
  }, [fetchUserProfile]);

  const handleFollowToggle = async () => {
    if (!user) return;

    try {
      if (user.isFollowing) {
        await onUnfollow?.(userId);
        setUser((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: false,
                followersCount: prev.followersCount - 1,
              }
            : null,
        );
      } else {
        await onFollow?.(userId);
        setUser((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: true,
                followersCount: prev.followersCount + 1,
              }
            : null,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update follow status');
    }
  };

  const styles = {
    container: {
      padding: '24px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      marginBottom: '24px',
    },
    avatar: {
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      objectFit: 'cover' as const,
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: '24px',
      fontWeight: 600,
      margin: '0 0 8px',
      color: '#1a1a1a',
    },
    username: {
      fontSize: '16px',
      color: '#666',
      margin: '0 0 16px',
    },
    bio: {
      fontSize: '16px',
      lineHeight: '1.5',
      color: '#333',
      margin: '0 0 16px',
    },
    stats: {
      display: 'flex',
      gap: '24px',
      marginBottom: '24px',
    },
    stat: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
    },
    statValue: {
      fontSize: '20px',
      fontWeight: 600,
      color: '#1a1a1a',
    },
    statLabel: {
      fontSize: '14px',
      color: '#666',
    },
    followButton: {
      padding: '8px 24px',
      borderRadius: '20px',
      border: 'none',
      fontSize: '16px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      backgroundColor: user?.isFollowing ? '#e0e0e0' : '#2196f3',
      color: user?.isFollowing ? '#333' : '#fff',
      '&:hover': {
        backgroundColor: user?.isFollowing ? '#d0d0d0' : '#1976d2',
      },
    },
    loading: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '200px',
    },
    error: {
      color: '#d32f2f',
      textAlign: 'center' as const,
      padding: '16px',
    },
  };

  if (isLoading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  if (!user) {
    return <div style={styles.error}>User not found</div>;
  }

  return (
    <div style={styles.container} className={className}>
      <div style={styles.header}>
        <img src={user.avatar} alt={user.displayName} style={styles.avatar} />
        <div style={styles.info}>
          <h1 style={styles.name}>{user.displayName}</h1>
          <p style={styles.username}>@{user.username}</p>
          <p style={styles.bio}>{user.bio}</p>
          <button
            style={styles.followButton}
            onClick={() => void handleFollowToggle()}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = user.isFollowing ? '#d0d0d0' : '#1976d2')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = user.isFollowing ? '#e0e0e0' : '#2196f3')
            }
          >
            {user.isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
      </div>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <span style={styles.statValue}>{user.postsCount}</span>
          <span style={styles.statLabel}>Posts</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{user.followersCount}</span>
          <span style={styles.statLabel}>Followers</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{user.followingCount}</span>
          <span style={styles.statLabel}>Following</span>
        </div>
      </div>
    </div>
  );
};
