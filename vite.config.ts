import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';
import type { UserConfig, ConfigEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }: ConfigEnv): UserConfig => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');
  
  // Determine if we're building for Electron
  const isElectron = env.IS_ELECTRON === 'true';
  
  // Get server port from environment or use default
  const serverPort = parseInt(env.PORT || '8080', 10);
  const clientPort = parseInt(env.CLIENT_PORT || '3001', 10);
  
  return {
    plugins: [
      react({
        // Enable Fast Refresh
        fastRefresh: true,
        // Babel configuration if needed
        babel: {
          plugins: [
            // Add any babel plugins here
          ],
        },
      }),
      tsconfigPaths(),
    ],
    
    server: {
      port: clientPort,
      strictPort: true, // Fail if port is in use
      open: false, // Don't open browser automatically
      host: env.HOST || 'localhost',
      cors: true,
      proxy: {
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/ws': {
          target: `ws://localhost:${serverPort}`,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/socket.io': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
      // HMR configuration
      hmr: {
        overlay: true,
      },
    },
    
    build: {
      outDir: 'dist/client',
      emptyOutDir: true,
      sourcemap: mode !== 'production' || env.SOURCEMAP === 'true',
      // Target modern browsers (2023+)
      target: 'es2022',
      // Minification settings
      minify: mode === 'production' ? 'esbuild' : false,
      // CSS handling
      cssMinify: mode === 'production',
      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/client/index.html'),
        },
        output: {
          // Code splitting configuration
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // Group node_modules into vendor chunk
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              return 'vendor';
            }
          },
          // Asset file naming format
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'chunks/[name]-[hash].js',
          entryFileNames: 'entries/[name]-[hash].js',
        },
      },
    },
    
    // Add root configuration to point to the client directory
    root: resolve(__dirname, 'src/client'),
    
    // Environment variables to expose to the client
    define: {
      __IS_ELECTRON__: isElectron,
      __APP_VERSION__: JSON.stringify(env.npm_package_version || '0.0.0'),
      __DEV__: mode !== 'production',
      // Exclude Node.js specific env from client bundle
      'process.env': {}, // Empty to prevent leaking server env vars
    },
    
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@client': resolve(__dirname, 'src/client'),
        '@server': resolve(__dirname, 'src/server'),
        '@shared': resolve(__dirname, 'src/shared'),
        '@platforms': resolve(__dirname, 'src/platforms'),
        // Add React aliases for consistent imports
        'react/jsx-runtime': resolve(__dirname, 'node_modules/react/jsx-runtime'),
      },
      // Explicitly specify extensions to improve module resolution
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    },
    
    optimizeDeps: {
      // Optimize dependencies during dev
      include: [
        'react',
        'react-dom',
        'react-router-dom',
      ],
      exclude: isElectron ? [] : ['electron'],
      // Force optimization of some dependencies
      force: true,
    },
    
    // Type checking performance improvements
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
    },
    
    // Electron-specific configuration
    ...(isElectron && {
      build: {
        rollupOptions: {
          external: ['electron'],
          output: {
            format: 'esm',
            entryFileNames: '[name].js',
            chunkFileNames: '[name].js',
            assetFileNames: '[name].[ext]',
          },
        },
      },
    }),
  };
});