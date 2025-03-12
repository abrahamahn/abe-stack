import React from 'react';
import { useClientEnvironment } from '../../services/ClientEnvironment';
import { Link } from '../ui/Link';

export function SettingsPage() {
  const environment = useClientEnvironment();
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Settings Page</h1>
      <p>Configure your application settings here.</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Application Settings</h2>
        
        <div style={{ marginTop: '16px' }}>
          <h3>User Preferences</h3>
          <div style={{ marginTop: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Theme</label>
              <select style={{ padding: '8px', width: '100%', maxWidth: '300px', borderRadius: '4px' }}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System Default</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Language</label>
              <select style={{ padding: '8px', width: '100%', maxWidth: '300px', borderRadius: '4px' }}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input type="checkbox" style={{ marginRight: '8px' }} />
                Enable notifications
              </label>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input type="checkbox" style={{ marginRight: '8px' }} />
                Enable sound effects
              </label>
            </div>
          </div>
        </div>
        
        <div style={{ marginTop: '24px' }}>
          <h3>Account Settings</h3>
          <div style={{ marginTop: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Email</label>
              <input 
                type="email" 
                placeholder="your@email.com" 
                style={{ padding: '8px', width: '100%', maxWidth: '300px', borderRadius: '4px' }}
              />
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                style={{ padding: '8px', width: '100%', maxWidth: '300px', borderRadius: '4px' }}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        <button 
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--blue)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Save Settings
        </button>
        
        <Link 
          to="/"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: 'var(--blue)',
            border: '1px solid var(--blue)',
            borderRadius: '4px',
            cursor: 'pointer',
            textDecoration: 'none'
          }}
        >
          Back to Main
        </Link>
      </div>
    </div>
  );
} 