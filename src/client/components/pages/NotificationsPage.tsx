import React, { useState } from 'react';
import { useClientEnvironment } from '../../services/ClientEnvironment';
import { PageContent } from '../layouts/PageContent';

export function NotificationsPage() {
  const environment = useClientEnvironment();
  const [activeTab, setActiveTab] = useState('all');
  
  // Mock notifications data
  const notifications = [
    { id: 1, type: 'comment', user: 'Jane Smith', content: 'commented on your post', time: '2 minutes ago', read: false },
    { id: 2, type: 'like', user: 'John Doe', content: 'liked your photo', time: '15 minutes ago', read: false },
    { id: 3, type: 'follow', user: 'Alice Johnson', content: 'started following you', time: '1 hour ago', read: false },
    { id: 4, type: 'mention', user: 'Bob Wilson', content: 'mentioned you in a comment', time: '3 hours ago', read: true },
    { id: 5, type: 'system', user: 'ABE Stack', content: 'Your account was successfully verified', time: '1 day ago', read: true },
    { id: 6, type: 'comment', user: 'Carol Taylor', content: 'replied to your comment', time: '2 days ago', read: true },
  ];
  
  const filteredNotifications = activeTab === 'all' 
    ? notifications 
    : activeTab === 'unread' 
      ? notifications.filter(n => !n.read) 
      : notifications.filter(n => n.type === activeTab);
  
  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'comment': return '💬';
      case 'like': return '❤️';
      case 'follow': return '👤';
      case 'mention': return '@️';
      case 'system': return '🔔';
      default: return '📣';
    }
  };
  
  return (
    <PageContent
      title="Notifications"
      description="Stay updated with your latest activity and interactions."
    >
      {/* Tabs */}
      <div style={{ marginTop: '20px', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
          {['all', 'unread', 'comment', 'like', 'follow', 'mention'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 15px',
                backgroundColor: 'transparent',
                color: activeTab === tab ? 'var(--blue)' : 'inherit',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--blue)' : 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      
      {/* Notifications List */}
      <div style={{ marginTop: '20px' }}>
        {filteredNotifications.length === 0 ? (
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center', 
            backgroundColor: '#f9f9f9', 
            borderRadius: '8px',
            color: '#666'
          }}>
            No notifications to display
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredNotifications.map(notification => (
              <div 
                key={notification.id}
                style={{ 
                  padding: '15px', 
                  backgroundColor: notification.read ? 'white' : 'rgba(0, 120, 255, 0.05)', 
                  borderRadius: '8px',
                  border: '1px solid #eee',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  backgroundColor: notification.read ? '#f0f0f0' : 'var(--blue)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: notification.read ? '#666' : 'white',
                  fontSize: '18px'
                }}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                    <span style={{ fontWeight: 'bold' }}>{notification.user}</span> {notification.content}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                    {notification.time}
                  </div>
                </div>
                <button style={{ 
                  backgroundColor: 'transparent', 
                  border: 'none', 
                  cursor: 'pointer',
                  color: '#666',
                  padding: '5px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  •••
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
        <button style={{ 
          padding: '10px 20px', 
          backgroundColor: 'white', 
          color: 'var(--blue)', 
          border: '1px solid var(--blue)', 
          borderRadius: '4px', 
          cursor: 'pointer' 
        }}>
          Mark all as read
        </button>
        <button style={{ 
          padding: '10px 20px', 
          backgroundColor: 'white', 
          color: '#666', 
          border: '1px solid #ddd', 
          borderRadius: '4px', 
          cursor: 'pointer' 
        }}>
          Notification settings
        </button>
      </div>
    </PageContent>
  );
} 