import React, { useState, ReactNode } from 'react';
import { useClientEnvironment } from '../../services/ClientEnvironment';
import Button from '../ui/Button';
import { Link } from '../ui/Link';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [showTopbar, setShowTopbar] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showBottomBar, setShowBottomBar] = useState(true);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopbarLayout show={showTopbar} setShow={setShowTopbar} />

      <div style={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        <LeftPanelLayout show={showSidebar} setShow={setShowSidebar} />

        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          {children}
        </div>

        <RightPanelLayout show={showRightPanel} setShow={setShowRightPanel} />
      </div>

      <BottombarLayout show={showBottomBar} setShow={setShowBottomBar} />
    </div>
  );
}

function TopbarLayout(props: { show: boolean; setShow: (show: boolean) => void }) {
  return (
    <div
      style={{
        flexGrow: 0,
        flexShrink: 0,
        borderBottom: '2px solid var(--transparent1)',
        transition: !props.show ? 'height 0.1s ease-in' : 'height 0.1s ease-out',
        height: props.show ? 64 : 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%', padding: '0 16px' }}>
        <h1>ABE Stack</h1>
        <div style={{ marginLeft: 'auto' }}>
          <Button onClick={() => props.setShow(!props.show)}>{props.show ? 'Hide Header' : 'Show Header'}</Button>
        </div>
      </div>
    </div>
  );
}

function BottombarLayout(props: { show: boolean; setShow: (show: boolean) => void }) {
  return (
    <div
      style={{
        flexGrow: 0,
        flexShrink: 0,
        borderTop: '2px solid var(--transparent1)',
        transition: !props.show ? 'height 0.1s ease-in' : 'height 0.1s ease-out',
        height: props.show ? 64 : 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>ABE Stack &copy; {new Date().getFullYear()}</span>
        <Button onClick={() => props.setShow(!props.show)}>
          {props.show ? 'Hide Footer' : 'Show Footer'}
        </Button>
      </div>
    </div>
  );
}

function LeftPanelLayout(props: { show: boolean; setShow: (show: boolean) => void }) {
  return (
    <div
      style={{
        flexGrow: 0,
        flexShrink: 0,
        borderRight: '2px solid var(--transparent1)',
        transition: !props.show ? 'width 0.1s ease-in' : 'width 0.1s ease-out',
        width: props.show ? 256 : 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px' }}>
        <h2>Navigation</h2>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '16px' }}>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/dashboard"
              style={{ textDecoration: 'none', color: 'var(--blue)' }}
              activeStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
            >
              Dashboard
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/home"
              style={{ textDecoration: 'none', color: 'var(--blue)' }}
              activeStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
            >
              Home
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/explore"
              style={{ textDecoration: 'none', color: 'var(--blue)' }}
              activeStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
            >
              Explore
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/media"
              style={{ textDecoration: 'none', color: 'var(--blue)' }}
              activeStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
            >
              Media
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/upload"
              style={{ textDecoration: 'none', color: 'var(--blue)' }}
              activeStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
            >
              Upload
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/social"
              style={{ textDecoration: 'none', color: 'var(--blue)' }}
              activeStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
            >
              Social
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/notifications"
              style={{ textDecoration: 'none', color: 'var(--blue)' }}
              activeStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
            >
              Notifications
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/profile"
              style={{ textDecoration: 'none', color: 'var(--blue)' }}
              activeStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
            >
              Profile
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/settings"
              style={{ textDecoration: 'none', color: 'var(--blue)' }}
              activeStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
            >
              Settings
            </Link>
          </li>
        </ul>
        <Button onClick={() => props.setShow(!props.show)} style={{ marginTop: '16px' }}>
          {props.show ? 'Hide Sidebar' : 'Show Sidebar'}
        </Button>
      </div>
    </div>
  );
}

function RightPanelLayout(props: { show: boolean; setShow: (show: boolean) => void }) {
  return (
    <div
      style={{
        flexGrow: 0,
        flexShrink: 0,
        borderLeft: '2px solid var(--transparent1)',
        transition: !props.show ? 'width 0.1s ease-in' : 'width 0.1s ease-out',
        width: props.show ? 256 : 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px' }}>
        <h2>Details</h2>
        <div style={{ marginTop: '16px' }}>
          <p>This panel can show details, notifications, or other contextual information.</p>
        </div>
        <Button onClick={() => props.setShow(!props.show)} style={{ marginTop: '16px' }}>
          {props.show ? 'Hide Details' : 'Show Details'}
        </Button>
      </div>
    </div>
  );
} 