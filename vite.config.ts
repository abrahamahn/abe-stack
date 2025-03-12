// vite.config.js
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default ({ mode = 'development' }) => {
  // Load env variables
  const env = process.env;
  
  // Determine if we're building for Electron
  const isElectron = env.IS_ELECTRON === 'true';
  
  // Get server port from environment or use default
  const serverPort = parseInt(env.PORT || '8080', 10);
  const clientPort = parseInt(env.CLIENT_PORT || '3000', 10);
  
  return {
    plugins: [
      react(),
      tsconfigPaths(),
    ],
    
    server: {
      port: clientPort,
      host: env.HOST || 'localhost',
      cors: true,
      proxy: {
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/api/, ''),
        },
        '/ws': {
          target: `ws://localhost:${serverPort}`,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
    
    build: {
      outDir: 'dist/client',
      emptyOutDir: true,
      sourcemap: mode !== 'production',
      target: 'es2022',
      minify: mode === 'production' ? 'esbuild' : false,
      cssMinify: mode === 'production',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/client/index.html'),
        },
        output: {
          manualChunks: (id: string) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              return 'vendor';
            }
          },
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'chunks/[name]-[hash].js',
          entryFileNames: 'entries/[name]-[hash].js',
        },
      },
    },
    
    root: resolve(__dirname, 'src/client'),
    
    define: {
      __IS_ELECTRON__: isElectron,
      __APP_VERSION__: JSON.stringify(env.npm_package_version || '0.0.0'),
      __DEV__: mode !== 'production',
      'process.env': {},
    },
    
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@client': resolve(__dirname, 'src/client'),
        '@server': resolve(__dirname, 'src/server'),
        '@shared': resolve(__dirname, 'src/shared'),
      },
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    },
    
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
      ],
      exclude: isElectron ? [] : ['electron'],
    },
    
    // Electron-specific configuration
    ...(isElectron && {
      build: {
        rollupOptions: {
          external: ['electron'],
          output: {
            format: 'esm',
          },
        },
      },
    }),
  };
};