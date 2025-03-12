import React from 'react';
import { PageContent } from '../layouts/PageContent';

export function ProfilePage() {
  return (
    <PageContent
      title="Profile"
      description="View and edit your profile information."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '20px' }}>
        {/* Profile Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--blue)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white',
            fontSize: '36px',
            fontWeight: 'bold'
          }}>
            JD
          </div>
          <div>
            <h2 style={{ margin: '0 0 5px 0' }}>John Doe</h2>
            <div style={{ color: '#666' }}>@johndoe</div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '15px' }}>
              <div><strong>42</strong> Posts</div>
              <div><strong>128</strong> Followers</div>
              <div><strong>97</strong> Following</div>
            </div>
          </div>
          <button style={{ 
            marginLeft: 'auto', 
            padding: '8px 16px', 
            backgroundColor: 'var(--blue)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}>
            Edit Profile
          </button>
        </div>
        
        {/* Profile Bio */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>About</h3>
          <p style={{ margin: '0', lineHeight: '1.6' }}>
            Full-stack developer passionate about creating beautiful and functional web applications.
            Currently working with React, TypeScript, and Node.js. When I'm not coding, you can find
            me hiking or reading science fiction.
          </p>
        </div>
        
        {/* Profile Details */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: '15px' }}>
            <div style={{ fontWeight: 'bold' }}>Location:</div>
            <div>San Francisco, CA</div>
            
            <div style={{ fontWeight: 'bold' }}>Website:</div>
            <div>johndoe.dev</div>
            
            <div style={{ fontWeight: 'bold' }}>Joined:</div>
            <div>January 2023</div>
            
            <div style={{ fontWeight: 'bold' }}>Work:</div>
            <div>Senior Developer at TechCorp</div>
          </div>
        </div>
        
        {/* Recent Activity */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 'bold' }}>Posted a new article</div>
                <div style={{ color: '#666', fontSize: '14px' }}>2 days ago</div>
              </div>
              <p style={{ margin: '10px 0 0 0' }}>
                "Getting Started with TypeScript and React: A Beginner's Guide"
              </p>
            </div>
            
            <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 'bold' }}>Updated profile picture</div>
                <div style={{ color: '#666', fontSize: '14px' }}>1 week ago</div>
              </div>
            </div>
            
            <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 'bold' }}>Shared a repository</div>
                <div style={{ color: '#666', fontSize: '14px' }}>2 weeks ago</div>
              </div>
              <p style={{ margin: '10px 0 0 0' }}>
                "react-typescript-starter: A minimal starter template for React with TypeScript"
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageContent>
  );
} 