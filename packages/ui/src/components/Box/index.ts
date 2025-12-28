// Platform-specific Box implementations
// Use index.web.tsx for web/desktop, index.native.tsx for React Native

export * from './types';

// Re-export the appropriate implementation based on platform
// The bundler will pick the correct one based on the platform
export { Box } from './index.web';
