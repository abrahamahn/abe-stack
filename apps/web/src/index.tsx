import React from "react";
import { createRoot } from "react-dom/client";

import { Root } from "./components/Root";
import "./index.css";
import { createApi } from "./services/api";
import { Router } from "./services/Router";
import { WebsocketPubsubClient } from "./services/WebsocketPubsubClient";

// Function to get the server port
const getServerPort = (): number => {
  // In production, use the same port as the client
  if (process.env.NODE_ENV === "production") {
    return window.location.port ? parseInt(window.location.port) : 80;
  }

  // In development, try to find the server port
  // First, check if we can read the port from localStorage (set by previous successful connections)
  const savedPort = localStorage.getItem("server_port");
  if (savedPort) {
    return parseInt(savedPort);
  }

  // Default to 8080 for the server in development
  return 8080;
};

// Create client configuration
const clientConfig = {
  // Always use relative path in development to leverage Vite's proxy
  apiUrl: "/api",
  wsUrl:
    process.env.NODE_ENV === "production"
      ? `ws://${window.location.host}/ws`
      : `ws://${window.location.hostname}:${getServerPort()}/ws`,
  production: process.env.NODE_ENV === "production",
  host: window.location.host,
};

// Add a function to test API connectivity and update port if needed
const testApiConnectivity = async () => {
  if (process.env.NODE_ENV === "production") {
    return; // No need to test in production
  }

  // Try to connect to the API
  try {
    const response = await fetch(clientConfig.apiUrl);
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Connected to backend API successfully:", data);
      document.body.style.setProperty("--api-connected", "true");
      return;
    }
  } catch (_error) {
    console.warn("Failed to connect to API, trying alternative ports...");
  }

  // If connection failed, try alternative ports
  // Try server ports first (8080-8085), then try client ports (3000-3005) in case server is running there
  const alternativePorts = [
    8080, 8081, 8082, 8083, 8084, 8085, 3000, 3001, 3002, 3003, 3004, 3005,
  ];

  for (const port of alternativePorts) {
    try {
      const testUrl = `${window.location.protocol}//${window.location.hostname}:${port}/api`;
      const response = await fetch(testUrl);

      if (response.ok) {
        // Found a working port, update config and save it
        console.log(`Connected to API on port ${port}`);
        clientConfig.apiUrl = testUrl;
        clientConfig.wsUrl = `ws://${window.location.hostname}:${port}/ws`;
        localStorage.setItem("server_port", port.toString());
        break;
      }
    } catch (_error) {
      console.warn(`Failed to connect on port ${port}`);
    }
  }
};

// Initialize services
const router = new Router();
const api = createApi();
const pubsub = new WebsocketPubsubClient({
  config: clientConfig,
  onStart: () => {
    console.log("WebSocket connected");
  },
  onChange: (key, value) => {
    console.log("Data changed:", key, value);
  },
});

// Test API connectivity when the app starts
void testApiConnectivity().then(() => {
  console.log("API connectivity test completed");
});

// Create client environment
const environment = {
  config: clientConfig,
  router,
  api,
  pubsub,
};

// Make environment available globally for debugging
interface WindowWithEnvironment extends Window {
  router: typeof router;
  api: typeof api;
  pubsub: typeof pubsub;
  environment: typeof environment;
}

(window as unknown as WindowWithEnvironment).router = router;
(window as unknown as WindowWithEnvironment).api = api;
(window as unknown as WindowWithEnvironment).pubsub = pubsub;
(window as unknown as WindowWithEnvironment).environment = environment;

// Find root element
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

// Render the app
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Root environment={environment} />
  </React.StrictMode>
);
