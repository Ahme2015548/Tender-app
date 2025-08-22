(async () => {
  console.log("Running Vite build with Vercel chunk repair...");
  console.log("Node version:", process.version);
  
  // Check and repair Vite chunks
  const fs = require('fs');
  const path = require('path');
  const { execSync } = require('child_process');
  
  const viteChunksPath = 'node_modules/vite/dist/node/chunks';
  const viteNodePath = 'node_modules/vite/dist/node';
  
  console.log("🔍 Checking Vite installation integrity...");
  
  // Always try to repair if on Vercel or if chunks are missing
  const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
  const chunksExist = fs.existsSync(viteChunksPath);
  
  if (!chunksExist || isVercel) {
    console.log("🔧 Proactively reinstalling Vite for Vercel compatibility...");
    try {
      // Force clean reinstall
      execSync('npm uninstall vite', { stdio: 'inherit' });
      execSync('npm cache clean --force', { stdio: 'inherit', timeout: 30000 });
      execSync('npm install vite@5.4.10 --save-dev', { stdio: 'inherit', timeout: 120000 });
      
      if (fs.existsSync(viteChunksPath)) {
        console.log("✅ Vite chunks installed successfully!");
      } else {
        console.log("⚠️ Chunks still missing after reinstall...");
      }
    } catch (repairErr) {
      console.log("⚠️ Vite repair failed:", repairErr?.message);
    }
  } else {
    console.log("✅ Vite chunks directory exists");
  }
  
  // Method 1: Direct Vite command first
  try {
    console.log("🚀 Attempting direct Vite build command...");
    execSync('node ./node_modules/vite/bin/vite.js build', { stdio: 'inherit' });
    console.log("✅ Direct Vite build completed.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Direct build failed:", err?.message || err);
  }

  // Method 2: Try programmatic API
  try {
    console.log("🚀 Attempting programmatic Vite build...");
    const { build } = await import('vite');
    await build({
      configFile: path.resolve(process.cwd(), 'vite.config.mjs'),
      build: {
        outDir: 'dist',
        emptyOutDir: true
      }
    });
    console.log("✅ Programmatic Vite build completed.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Programmatic build failed:", err?.message || err);
  }
  
  // Method 3: Try manual Rollup build (bypass Vite chunks)
  try {
    console.log("🔨 Attempting manual Rollup build (bypass chunks)...");
    const rollup = require('rollup');
    const { nodeResolve } = require('@rollup/plugin-node-resolve');
    
    // Simple manual build without Vite's internal chunks
    const inputOptions = {
      input: 'src/main.jsx',
      plugins: [
        nodeResolve({ preferBuiltins: false }),
        {
          name: 'jsx-transform',
          transform(code, id) {
            if (id.endsWith('.jsx') || id.endsWith('.js')) {
              // Very basic JSX transform for emergency fallback
              return code.replace(/import\s+React/g, 'const React = window.React');
            }
            return null;
          }
        }
      ]
    };
    
    console.log("⚠️ Manual build too complex, trying system approach...");
  } catch (rollupErr) {
    console.log("❌ Manual build not viable:", rollupErr?.message);
  }
  
  // If all methods fail, exit with error
  console.error("🔥 All build methods failed");
  console.error("❌ Could not build application");
  process.exit(1);
})();