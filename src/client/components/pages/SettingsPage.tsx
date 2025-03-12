import React from 'react';
import { PageContent } from '../layouts/PageContent';
import { useTheme } from '../theme';
import './settings-page.css';

export function SettingsPage() {
  const { theme, toggleTheme, useSystemTheme, isUsingSystemTheme } = useTheme();

  return (
    <PageContent 
      title="Settings" 
      description="Customize your application preferences"
    >
      <div className="settings-container">
        <div className="settings-section">
          <h2>Appearance</h2>
          <div className="settings-option">
            <label htmlFor="system-theme">Use System Theme</label>
            <div className="theme-toggle-container">
              <label className="switch">
                <input 
                  type="checkbox" 
                  id="system-theme"
                  checked={isUsingSystemTheme}
                  onChange={useSystemTheme}
                />
                <span className="slider round"></span>
              </label>
              <span className="theme-label">Follow system light/dark preference</span>
            </div>
          </div>
          
          {!isUsingSystemTheme && (
            <div className="settings-option">
              <label htmlFor="theme-toggle">Theme</label>
              <div className="theme-toggle-container">
                <span className="theme-label">Light</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    id="theme-toggle"
                    checked={theme === 'dark'}
                    onChange={toggleTheme}
                  />
                  <span className="slider round"></span>
                </label>
                <span className="theme-label">Dark</span>
              </div>
            </div>
          )}
        </div>

        <div className="settings-section">
          <h2>Account</h2>
          <div className="settings-option">
            <p>Account settings will be available soon.</p>
          </div>
        </div>

        <div className="settings-section">
          <h2>Notifications</h2>
          <div className="settings-option">
            <p>Notification settings will be available soon.</p>
          </div>
        </div>

        <div className="settings-section">
          <h2>Privacy</h2>
          <div className="settings-option">
            <p>Privacy settings will be available soon.</p>
          </div>
        </div>
      </div>
    </PageContent>
  );
} 