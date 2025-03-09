import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Root } from './components/Root';
import { Router } from './services/Router';
import { WebsocketPubsubClient } from './services/WebsocketPubsubClient';
import { createApi } from './services/api';

// Create client configuration
const clientConfig = {
  apiUrl: '/api',
  wsUrl: `ws://${window.location.host}/ws`,
  production: process.env.NODE_ENV === 'production'
};

// Initialize services
const router = new Router();
const api = createApi();
const pubsub = new WebsocketPubsubClient({
  config: clientConfig,
  onStart: () => {
    console.log('WebSocket connected');
  },
  onChange: (key, value) => {
    console.log('Data changed:', key, value);
  }
});

// Create client environment
const environment = {
  config: clientConfig,
  router,
  api,
  pubsub
};

// Make environment available globally for debugging
(window as any).router = router;
(window as any).api = api;
(window as any).pubsub = pubsub;
(window as any).environment = environment;

// Find root element
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

// Render the app
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Root environment={environment} />
  </React.StrictMode>
);