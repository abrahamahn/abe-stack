import { Button } from '@abe-stack/ui';
import { useNavigate, type NavigateFunction } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

import type { User } from '../contexts/AuthContext';
import type { JSX } from 'react';

export function DashboardPage(): JSX.Element {
  const { user, logout }: { user: User | null; logout: () => Promise<void> } = useAuth();
  const navigate: NavigateFunction = useNavigate();

  const handleLogout = async (): Promise<void> => {
    await logout();
    void navigate('/');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard</h1>
        <Button
          onClick={() => {
            void handleLogout();
          }}
        >
          Logout
        </Button>
      </div>

      <div
        style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <h2>Your Profile</h2>
        <div style={{ marginTop: '15px' }}>
          <p>
            <strong>Email:</strong> {user?.email}
          </p>
          <p>
            <strong>Name:</strong> {user?.name || 'Not provided'}
          </p>
          <p>
            <strong>User ID:</strong> {user?.id}
          </p>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Welcome to your dashboard!</h3>
        <p style={{ lineHeight: '1.6', color: '#666' }}>
          This is a protected route that requires authentication. You can only access this page when
          logged in with a valid JWT token.
        </p>
      </div>
    </div>
  );
}
