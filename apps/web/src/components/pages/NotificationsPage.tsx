import { useState } from 'react';

import { PageContent } from '../../layouts/PageContent';

// Notifications page styles
const styles = {
  tabs: {
    marginTop: '20px',
    borderBottom: '1px solid var(--border-color)',
  },
  tabButtons: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto' as const,
  },
  tabButton: {
    padding: '10px 15px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textTransform: 'capitalize' as const,
    color: 'var(--text-primary)',
  },
  tabButtonActive: {
    color: 'var(--blue)',
    borderBottom: '2px solid var(--blue)',
    fontWeight: 'bold',
  },
  container: {
    marginTop: '20px',
  },
  empty: {
    padding: '40px 20px',
    textAlign: 'center' as const,
    backgroundColor: 'var(--surface)',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  item: {
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  itemUnread: {
    backgroundColor: 'rgba(0, 120, 255, 0.05)',
  },
  itemRead: {
    backgroundColor: 'var(--card-bg)',
  },
  icon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  iconUnread: {
    backgroundColor: 'var(--blue)',
    color: 'white',
  },
  iconRead: {
    backgroundColor: 'var(--surface)',
    color: 'var(--text-secondary)',
  },
  content: {
    flex: 1,
  },
  text: {
    color: 'var(--text-primary)',
  },
  textUnread: {
    fontWeight: 'bold',
  },
  username: {
    fontWeight: 'bold',
    color: 'var(--text-primary)',
  },
  time: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '5px',
  },
  menuButton: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: '5px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    marginTop: '30px',
    display: 'flex',
    justifyContent: 'space-between',
  },
  actionButton: {
    padding: '10px 20px',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  actionPrimary: {
    color: 'var(--blue)',
    border: '1px solid var(--blue)',
  },
  actionSecondary: {
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
  },
};

export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('all');

  // Mock notifications data
  const notifications = [
    {
      id: 1,
      type: 'comment',
      user: 'Jane Smith',
      content: 'commented on your post',
      time: '2 minutes ago',
      read: false,
    },
    {
      id: 2,
      type: 'like',
      user: 'John Doe',
      content: 'liked your photo',
      time: '15 minutes ago',
      read: false,
    },
    {
      id: 3,
      type: 'follow',
      user: 'Alice Johnson',
      content: 'started following you',
      time: '1 hour ago',
      read: false,
    },
    {
      id: 4,
      type: 'mention',
      user: 'Bob Wilson',
      content: 'mentioned you in a comment',
      time: '3 hours ago',
      read: true,
    },
    {
      id: 5,
      type: 'system',
      user: 'ABE Stack',
      content: 'Your account was successfully verified',
      time: '1 day ago',
      read: true,
    },
    {
      id: 6,
      type: 'comment',
      user: 'Carol Taylor',
      content: 'replied to your comment',
      time: '2 days ago',
      read: true,
    },
  ];

  const filteredNotifications =
    activeTab === 'all'
      ? notifications
      : activeTab === 'unread'
        ? notifications.filter((n) => !n.read)
        : notifications.filter((n) => n.type === activeTab);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return '💬';
      case 'like':
        return '❤️';
      case 'follow':
        return '👤';
      case 'mention':
        return '@️';
      case 'system':
        return '🔔';
      default:
        return '📣';
    }
  };

  return (
    <PageContent
      title="Notifications"
      description="Stay updated with your latest activity and interactions."
    >
      {/* Tabs */}
      <div style={styles.tabs}>
        <div style={styles.tabButtons}>
          {['all', 'unread', 'comment', 'like', 'follow', 'mention'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab ? styles.tabButtonActive : {}),
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div style={styles.container}>
        {filteredNotifications.length === 0 ? (
          <div style={styles.empty}>No notifications to display</div>
        ) : (
          <div style={styles.list}>
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  ...styles.item,
                  ...(notification.read ? styles.itemRead : styles.itemUnread),
                }}
              >
                <div
                  style={{
                    ...styles.icon,
                    ...(notification.read ? styles.iconRead : styles.iconUnread),
                  }}
                >
                  {getNotificationIcon(notification.type)}
                </div>
                <div style={styles.content}>
                  <div
                    style={{
                      ...styles.text,
                      ...(notification.read ? {} : styles.textUnread),
                    }}
                  >
                    <span style={styles.username}>{notification.user}</span> {notification.content}
                  </div>
                  <div style={styles.time}>{notification.time}</div>
                </div>
                <button style={styles.menuButton}>•••</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button style={{ ...styles.actionButton, ...styles.actionPrimary }}>
          Mark all as read
        </button>
        <button style={{ ...styles.actionButton, ...styles.actionSecondary }}>
          Notification settings
        </button>
      </div>
    </PageContent>
  );
}
