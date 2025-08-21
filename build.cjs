#!/usr/bin/env node

// Simple build script wrapper for Vercel
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Running Vite build...');
  
  // Try multiple approaches to run Vite
  const attempts = [
    // Method 1: Use npx with full path
    'npx vite build',
    // Method 2: Direct node execution of vite CLI
    'node ./node_modules/vite/bin/vite.js build',
    // Method 3: Use npm run build:vite as fallback
    'npm run build:vite'
  ];
  
  let success = false;
  
  for (const command of attempts) {
    try {
      console.log(`Attempting: ${command}`);
      execSync(command, {
        cwd: __dirname,
        stdio: 'inherit',
        env: { ...process.env, PATH: process.env.PATH + ':' + path.join(__dirname, 'node_modules', '.bin') }
      });
      success = true;
      break;
    } catch (err) {
      console.log(`Failed: ${command} - ${err.message}`);
      continue;
    }
  }
  
  if (!success) {
    throw new Error('All build attempts failed');
  }
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}