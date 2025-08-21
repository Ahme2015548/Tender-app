#!/usr/bin/env node

// Vite programmatic API build script for Vercel
const path = require('path');
const fs = require('fs');

async function build() {
  try {
    console.log('Running Vite build via programmatic API...');
    
    // Import Vite programmatically to bypass binary permission issues
    const { build } = require('vite');
    
    // Run Vite build programmatically
    await build({
      configFile: path.resolve(__dirname, 'vite.config.js'),
      root: __dirname,
      base: '/',
      build: {
        outDir: 'dist',
        emptyOutDir: true
      }
    });
    
    console.log('Build completed successfully via Vite API!');
    
  } catch (error) {
    console.error('Programmatic build failed, trying fallback methods...');
    
    // Fallback to shell execution as last resort
    const { execSync } = require('child_process');
    
    const fallbackCommands = [
      'npx --yes vite@latest build',
      'npm run build:vite'
    ];
    
    let success = false;
    
    for (const command of fallbackCommands) {
      try {
        console.log(`Fallback attempting: ${command}`);
        execSync(command, {
          cwd: __dirname,
          stdio: 'inherit',
          env: { ...process.env }
        });
        success = true;
        break;
      } catch (err) {
        console.log(`Fallback failed: ${command} - ${err.message}`);
        continue;
      }
    }
    
    if (!success) {
      console.error('All build methods failed:', error.message);
      process.exit(1);
    }
    
    console.log('Build completed via fallback method!');
  }
}

build().catch((error) => {
  console.error('Build process failed:', error);
  process.exit(1);
});