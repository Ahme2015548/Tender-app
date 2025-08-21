import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Tender-app/',  // Set base path to match URL structure
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@frontend': resolve(__dirname, 'frontend/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Custom middleware to handle various routing patterns in development
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Handle various URL patterns that might redirect incorrectly
        if (req.url?.startsWith('/Tender-app')) {
          console.log('🔀 Redirecting /Tender-app:', req.url, '→', req.url.replace('/Tender-app', '') || '/');
          req.url = req.url.replace('/Tender-app', '') || '/';
        } else if (req.url?.startsWith('/tenderapp')) {
          console.log('🔀 Redirecting /tenderapp:', req.url, '→', req.url.replace('/tenderapp', '') || '/');
          req.url = req.url.replace('/tenderapp', '') || '/';
        } else if (req.url?.startsWith('/tender-app')) {
          console.log('🔀 Redirecting /tender-app:', req.url, '→', req.url.replace('/tender-app', '') || '/');
          req.url = req.url.replace('/tender-app', '') || '/';
        }
        next();
      });
    },
  },
})
