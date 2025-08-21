import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/Tender-app/",
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
    // Ensure assets are copied correctly during build
    assetsDir: 'assets',
    copyPublicDir: true,
    rollupOptions: {
      output: {
        // Keep asset names predictable
        assetFileNames: (assetInfo) => {
          // Keep images in their original structure
          if (assetInfo.name && assetInfo.name.match(/\.(png|jpe?g|svg|gif|webp)$/i)) {
            return 'images/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  // Explicitly handle static assets
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp']
})
