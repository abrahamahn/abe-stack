import React from 'react';
import { PageContent } from '../layouts/PageContent';

export function DashboardPage() {
  return (
    <PageContent
      title="Dashboard"
      description="Welcome to your personalized dashboard."
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {/* Stats Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Statistics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#666' }}>Views</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>1,254</div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666' }}>Likes</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>423</div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666' }}>Comments</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>97</div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666' }}>Shares</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>56</div>
            </div>
          </div>
        </div>
        
        {/* Recent Activity Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold' }}>New comment on your post</div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>2 minutes ago</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold' }}>Your post was featured</div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>1 hour ago</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold' }}>New follower: JaneDoe</div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>3 hours ago</div>
            </div>
          </div>
        </div>
        
        {/* Quick Actions Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button style={{ padding: '10px', backgroundColor: 'var(--blue)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'left' }}>
              Create New Post
            </button>
            <button style={{ padding: '10px', backgroundColor: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: '4px', cursor: 'pointer', textAlign: 'left' }}>
              Upload Media
            </button>
            <button style={{ padding: '10px', backgroundColor: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: '4px', cursor: 'pointer', textAlign: 'left' }}>
              Edit Profile
            </button>
          </div>
        </div>
        
        {/* Upcoming Events Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Upcoming Events</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '10px', borderLeft: '3px solid var(--blue)', backgroundColor: '#f5f5f5' }}>
              <div style={{ fontWeight: 'bold' }}>Team Meeting</div>
              <div style={{ fontSize: '14px', marginTop: '5px' }}>Tomorrow, 10:00 AM</div>
            </div>
            <div style={{ padding: '10px', borderLeft: '3px solid var(--green)', backgroundColor: '#f5f5f5' }}>
              <div style={{ fontWeight: 'bold' }}>Project Deadline</div>
              <div style={{ fontSize: '14px', marginTop: '5px' }}>Friday, 5:00 PM</div>
            </div>
            <div style={{ padding: '10px', borderLeft: '3px solid var(--purple)', backgroundColor: '#f5f5f5' }}>
              <div style={{ fontWeight: 'bold' }}>Webinar: New Features</div>
              <div style={{ fontSize: '14px', marginTop: '5px' }}>Next Monday, 2:00 PM</div>
            </div>
          </div>
        </div>
      </div>
    </PageContent>
  );
} 