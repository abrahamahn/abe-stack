// src/client/config/environment.ts
// Client-side environment configuration

// Type definitions for client environment variables
export interface ClientEnv {
    NODE_ENV: 'development' | 'production';
    API_URL: string;
    WS_URL: string;
    APP_TITLE: string;
  }
  
  // Helper function to access environment variables safely
  function getEnvVariable(key: string, defaultValue?: string): string {
    // Access Vite's import.meta.env at build time
    const envVar = import.meta.env[`VITE_${key}`];
    if (envVar === undefined && defaultValue === undefined) {
      console.warn(`Environment variable VITE_${key} is not defined`);
      return '';
    }
    return envVar || defaultValue || '';
  }
  
  // Client environment configuration
  export const clientEnv: ClientEnv = {
    NODE_ENV: getEnvVariable('NODE_ENV', 'development') as 'development' | 'production',
    API_URL: getEnvVariable('API_URL', '/api'),
    WS_URL: getEnvVariable('WS_URL', (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws'),
    APP_TITLE: getEnvVariable('APP_TITLE', 'ABE Stack Application'),
  };
  
  // Freeze the config object to prevent modifications
  Object.freeze(clientEnv);
  
  export default clientEnv;