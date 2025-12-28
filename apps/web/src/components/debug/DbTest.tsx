import React, { useState } from 'react';

import { useAuth } from '../auth/AuthContext';

export const DbTest: React.FC = () => {
  const { testDatabaseConnection } = useAuth();
  const [result, setResult] = useState<{
    success?: boolean;
    connected?: boolean;
    message?: string;
    timestamp?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const response = await testDatabaseConnection();
      setResult({
        ...response,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      setResult({
        success: false,
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: '15px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        margin: '10px 0',
        backgroundColor: '#f8f9fa',
      }}
    >
      <h3>Database Connection Test</h3>
      <button
        onClick={handleTestConnection}
        disabled={loading}
        style={{
          padding: '8px 15px',
          backgroundColor: loading ? '#cccccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Testing...' : 'Test Database Connection'}
      </button>

      {result.timestamp && (
        <div style={{ marginTop: '15px' }}>
          <div
            style={{
              padding: '10px',
              backgroundColor: result.connected ? '#d4edda' : '#f8d7da',
              border: `1px solid ${result.connected ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '4px',
              marginBottom: '10px',
            }}
          >
            <p>
              <strong>Status:</strong> {result.connected ? 'Connected ✅' : 'Failed to connect ❌'}
            </p>
            <p>
              <strong>Message:</strong> {result.message}
            </p>
            <p>
              <strong>Timestamp:</strong> {result.timestamp}
            </p>
          </div>
          <p>
            <small>Connection to: localhost:5432</small>
          </p>
        </div>
      )}
    </div>
  );
};
