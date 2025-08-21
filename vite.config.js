import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Force cache invalidation
const timestamp = Date.now()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  publicDir: 'public',
  server: {
    port: 5173,
    host: true,
    // Ensure assets are served correctly
    middlewareMode: false,
    fs: {
      // Allow serving files from the public directory
      strict: false
    }
  },
  build: {
    // Force new hash for cache invalidation
    assetsDir: 'assets',
    copyPublicDir: true,
    rollupOptions: {
      output: {
        // Force new hash on every build to break cache
        entryFileNames: `assets/[name]-${timestamp}-[hash].js`,
        chunkFileNames: `assets/[name]-${timestamp}-[hash].js`,
        assetFileNames: (assetInfo) => {
          // Keep images in their original structure
          if (assetInfo.name && assetInfo.name.match(/\.(png|jpe?g|svg|gif|webp)$/i)) {
            return 'images/[name][extname]';
          }
          // Force new hash with timestamp for CSS/JS assets
          return `assets/[name]-${timestamp}-[hash][extname]`;
        }
      }
    }
  },
  // Explicitly handle static assets
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp']
})
