#!/usr/bin/env node

// Simple build script wrapper for Vercel
const { execSync } = require('child_process');
const path = require('path');

try {
  // Set executable permissions and run vite build
  const vitePath = path.join(__dirname, 'node_modules', '.bin', 'vite');
  console.log('Running Vite build...');
  
  // Run vite build directly with node
  execSync('node node_modules/vite/bin/vite.js build', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}