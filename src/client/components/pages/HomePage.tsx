import React from 'react';
import { useClientEnvironment } from '../../services/ClientEnvironment';
import { PageContent } from '../layouts/PageContent';

export function HomePage() {
  const environment = useClientEnvironment();
  
  return (
    <PageContent 
      title="Home Page" 
      description="Welcome to the ABE Stack home page. This is where you can showcase your application's main features."
    >
      <div style={{ marginTop: '20px' }}>
        <h2>Features</h2>
        <ul>
          <li>Full-stack TypeScript</li>
          <li>Client-side routing</li>
          <li>WebSocket for real-time updates</li>
          <li>PostgreSQL database integration</li>
          <li>Modern React with hooks</li>
          <li>Vite for fast development</li>
          <li>Multimedia streaming capabilities</li>
          <li>Social media features</li>
        </ul>
      </div>
    </PageContent>
  );
} 