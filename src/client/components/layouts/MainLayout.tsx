import React, { useState } from 'react';
import { Link } from '../ui/Link';
import { Button } from '../ui/Button';
import { AuthModal, AuthModalType, useAuth } from '../auth';
import { useTheme } from '../theme';
import './main-layout.css';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showTopbar, setShowTopbar] = useState(true);
  const [showBottomBar, setShowBottomBar] = useState(true);
  const [authModal, setAuthModal] = useState<{ show: boolean, type: AuthModalType }>({ show: false, type: 'login' });
  
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme, isUsingSystemTheme } = useTheme();

  const openLoginModal = () => {
    setAuthModal({ show: true, type: 'login' });
  };

  const openRegisterModal = () => {
    setAuthModal({ show: true, type: 'register' });
  };

  const closeAuthModal = () => {
    setAuthModal({ show: false, type: authModal.type });
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="main-layout">
      {showTopbar && (
        <div className="top-bar">
          <div className="logo">ABE Stack</div>
          <div className="top-bar-actions">
            <button 
              className="theme-toggle-btn" 
              onClick={toggleTheme}
              aria-label={isUsingSystemTheme 
                ? "Using system theme preference" 
                : `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={isUsingSystemTheme 
                ? "Using system theme preference" 
                : `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {isUsingSystemTheme 
                ? '🖥️' 
                : theme === 'light' 
                  ? '🌙' 
                  : '☀️'}
            </button>
            {isAuthenticated ? (
              <div className="user-profile">
                <div 
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--accent)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <span className="username">{user?.name || 'User'}</span>
                <Button onClick={handleLogout}>Logout</Button>
              </div>
            ) : (
              <>
                <Button onClick={openLoginModal}>Log In</Button>
                <Button onClick={openRegisterModal}>Register</Button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="content-area">
        {showSidebar && (
          <div className="left-panel">
            <nav className="main-nav">
              <Link to="/">Home</Link>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/profile">Profile</Link>
              <Link to="/upload">Upload</Link>
              <Link to="/explore">Explore</Link>
              <Link to="/notifications">Notifications</Link>
              <Link to="/media">Media</Link>
              <Link to="/settings">Settings</Link>
            </nav>
          </div>
        )}

        <div className="main-content">
          {children}
        </div>

        {showRightPanel && (
          <div className="right-panel">
            <h3>Additional Info</h3>
            <p>This panel can contain contextual information, notifications, or other supplementary content.</p>
          </div>
        )}
      </div>

      {showBottomBar && (
        <div className="bottom-bar">
          <div>© 2023 ABE Stack</div>
          <div className="layout-controls">
            <button onClick={() => setShowSidebar(!showSidebar)}>
              {showSidebar ? 'Hide' : 'Show'} Left Panel
            </button>
            <button onClick={() => setShowRightPanel(!showRightPanel)}>
              {showRightPanel ? 'Hide' : 'Show'} Right Panel
            </button>
            <button onClick={() => setShowTopbar(!showTopbar)}>
              {showTopbar ? 'Hide' : 'Show'} Top Bar
            </button>
            <button onClick={() => setShowBottomBar(!showBottomBar)}>
              Hide Bottom Bar
            </button>
          </div>
        </div>
      )}

      <AuthModal 
        isOpen={authModal.show} 
        modalType={authModal.type} 
        onClose={closeAuthModal} 
      />
    </div>
  );
} 