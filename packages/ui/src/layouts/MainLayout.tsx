import React, { useEffect, useState } from "react";

import { AuthModal, AuthModalType, useAuth } from "../components/auth";
import { useTheme } from "../components/theme";
import { Button } from "../components/ui/Button";
import { Link } from "../components/ui/Link";
import "./main-layout.css";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showTopbar, setShowTopbar] = useState(true);
  const [showBottomBar, setShowBottomBar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [authModal, setAuthModal] = useState<{
    show: boolean;
    type: AuthModalType;
  }>({
    show: false,
    type: "login",
  });

  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme, isUsingSystemTheme } = useTheme();

  // Check if viewport is mobile size
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      // Auto-hide sidebar on mobile
      if (window.innerWidth <= 768) {
        setShowSidebar(false);
      } else {
        setShowSidebar(true);
      }
    };

    // Initial check
    checkIfMobile();

    // Add event listener
    window.addEventListener("resize", checkIfMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const openLoginModal = () => {
    setAuthModal({ show: true, type: "login" });
  };

  const openRegisterModal = () => {
    setAuthModal({ show: true, type: "register" });
  };

  const closeAuthModal = () => {
    setAuthModal({ show: false, type: authModal.type });
  };

  const handleLogout = () => {
    logout();
  };

  // Get the appropriate theme icon
  const getThemeIcon = () => {
    if (isUsingSystemTheme) {
      return "🖥️";
    } else {
      return theme === "light" ? "🌙" : "☀️";
    }
  };

  // Handle theme button click
  const handleThemeButtonClick = () => {
    if (!isUsingSystemTheme) {
      toggleTheme();
    }
  };

  // Toggle sidebar for mobile
  const toggleMobileSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="main-layout">
      {showTopbar && (
        <div className="top-bar">
          {isMobile && (
            <button
              className="mobile-menu-toggle"
              onClick={toggleMobileSidebar}
              aria-label={showSidebar ? "Close menu" : "Open menu"}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          )}
          <Link
            to="/"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div className="logo">ABE Stack</div>
          </Link>
          <div className="top-bar-actions">
            <button
              className={`theme-toggle-btn ${isUsingSystemTheme ? "system-theme" : ""}`}
              onClick={handleThemeButtonClick}
              aria-label={
                isUsingSystemTheme
                  ? "Using system theme preference"
                  : `Switch to ${theme === "light" ? "dark" : "light"} mode`
              }
              title={
                isUsingSystemTheme
                  ? "Using system theme preference (change in settings)"
                  : `Switch to ${theme === "light" ? "dark" : "light"} mode`
              }
            >
              {getThemeIcon()}
            </button>
            {isAuthenticated ? (
              <div className="user-profile">
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  {user?.displayName?.charAt(0) || "U"}
                </div>
                {!isMobile && (
                  <span className="username">
                    {user?.displayName || "User"}
                  </span>
                )}
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
          <div className={`left-panel ${isMobile ? "mobile" : ""}`}>
            <nav className="main-nav">
              {isMobile && (
                <div className="mobile-nav-header">
                  <button
                    className="close-mobile-nav"
                    onClick={() => setShowSidebar(false)}
                    aria-label="Close menu"
                  >
                    &times;
                  </button>
                </div>
              )}
              <Link
                to="/"
                onClick={isMobile ? () => setShowSidebar(false) : undefined}
              >
                Home
              </Link>
              <Link
                to="/dashboard"
                onClick={isMobile ? () => setShowSidebar(false) : undefined}
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                onClick={isMobile ? () => setShowSidebar(false) : undefined}
              >
                Profile
              </Link>
              <Link
                to="/upload"
                onClick={isMobile ? () => setShowSidebar(false) : undefined}
              >
                Upload
              </Link>
              <Link
                to="/explore"
                onClick={isMobile ? () => setShowSidebar(false) : undefined}
              >
                Explore
              </Link>
              <Link
                to="/notifications"
                onClick={isMobile ? () => setShowSidebar(false) : undefined}
              >
                Notifications
              </Link>
              <Link
                to="/media"
                onClick={isMobile ? () => setShowSidebar(false) : undefined}
              >
                Media
              </Link>
              <Link
                to="/settings"
                onClick={isMobile ? () => setShowSidebar(false) : undefined}
              >
                Settings
              </Link>
            </nav>
          </div>
        )}

        <div className="main-content">{children}</div>

        {showRightPanel && (
          <div className="right-panel">
            <h3>Additional Info</h3>
            <p>
              This panel can contain contextual information, notifications, or
              other supplementary content.
            </p>
          </div>
        )}
      </div>

      {showBottomBar && (
        <div className="bottom-bar">
          <div>© 2023 ABE Stack</div>
          {!isMobile && (
            <div className="layout-controls">
              <button onClick={() => setShowSidebar(!showSidebar)}>
                {showSidebar ? "Hide" : "Show"} Left Panel
              </button>
              <button onClick={() => setShowRightPanel(!showRightPanel)}>
                {showRightPanel ? "Hide" : "Show"} Right Panel
              </button>
              <button onClick={() => setShowTopbar(!showTopbar)}>
                {showTopbar ? "Hide" : "Show"} Top Bar
              </button>
              <button onClick={() => setShowBottomBar(!showBottomBar)}>
                Hide Bottom Bar
              </button>
            </div>
          )}
        </div>
      )}

      {isMobile && showSidebar && (
        <div
          className="mobile-overlay"
          onClick={() => setShowSidebar(false)}
        ></div>
      )}

      <AuthModal
        isOpen={authModal.show}
        modalType={authModal.type}
        onClose={closeAuthModal}
      />
    </div>
  );
}
