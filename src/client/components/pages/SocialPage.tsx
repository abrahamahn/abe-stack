import React from 'react';
import { useClientEnvironment } from '../../services/ClientEnvironment';
import { PageContent } from '../layouts/PageContent';

export function SocialPage() {
  const environment = useClientEnvironment();
  
  return (
    <PageContent
      title="Social Page"
      description="This page demonstrates the social media features of the ABE Stack."
    >
      <div style={{ marginTop: '20px' }}>
        <h2>Social Features</h2>
        <ul>
          <li>User profiles and authentication</li>
          <li>Friend/follow relationships</li>
          <li>Activity feeds with real-time updates</li>
          <li>Comments and reactions</li>
          <li>Content sharing</li>
          <li>Notifications</li>
        </ul>
      </div>
      
      {/* Example activity feed placeholder */}
      <div style={{ marginTop: '20px' }}>
        <h3>Activity Feed</h3>
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <div style={{ fontWeight: 'bold' }}>User123</div>
            <div style={{ marginTop: '8px' }}>Posted a new photo</div>
            <div style={{ marginTop: '8px', color: '#666' }}>2 minutes ago</div>
          </div>
          
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <div style={{ fontWeight: 'bold' }}>User456</div>
            <div style={{ marginTop: '8px' }}>Commented on your post</div>
            <div style={{ marginTop: '8px', color: '#666' }}>15 minutes ago</div>
          </div>
          
          <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <div style={{ fontWeight: 'bold' }}>User789</div>
            <div style={{ marginTop: '8px' }}>Liked your comment</div>
            <div style={{ marginTop: '8px', color: '#666' }}>1 hour ago</div>
          </div>
        </div>
      </div>
    </PageContent>
  );
} 