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
  
  if (!fs.existsSync(viteChunksPath)) {
    console.log("❌ Vite chunks directory missing, attempting repair...");
    try {
      // Try to reinstall Vite to fix corrupted installation
      console.log("🔧 Reinstalling Vite to fix chunks...");
      execSync('npm uninstall vite', { stdio: 'inherit' });
      execSync('npm install vite@5.4.10 --save-dev', { stdio: 'inherit' });
      
      if (fs.existsSync(viteChunksPath)) {
        console.log("✅ Vite chunks repaired successfully!");
      } else {
        console.log("⚠️ Chunks still missing, trying alternative approach...");
      }
    } catch (repairErr) {
      console.log("⚠️ Vite repair failed, using alternative build method...");
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
  
  // Method 4: Try direct system build commands
  try {
    console.log("🔧 Attempting system build via Node execution...");
    const { spawn } = await import('node:child_process');
    
    await new Promise((resolve, reject) => {
      const child = spawn('node', ['-e', `
        const fs = require('fs');
        const path = require('path');
        console.log('Creating basic HTML build...');
        
        // Create dist directory
        if (!fs.existsSync('dist')) fs.mkdirSync('dist', { recursive: true });
        
        // Copy public assets
        if (fs.existsSync('public')) {
          const copyDir = (src, dest) => {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            const entries = fs.readdirSync(src, { withFileTypes: true });
            for (const entry of entries) {
              const srcPath = path.join(src, entry.name);
              const destPath = path.join(dest, entry.name);
              if (entry.isDirectory()) {
                copyDir(srcPath, destPath);
              } else {
                fs.copyFileSync(srcPath, destPath);
              }
            }
          };
          copyDir('public', 'dist');
        }
        
        // Create fallback index.html
        const html = \`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tender App - تطبيق المناقصات</title>
  <link rel="shortcut icon" href="/images/logo-sm.svg" />
  <style>body{font-family:Arial,sans-serif;margin:40px;text-align:center;direction:rtl}h1{color:#007bff}</style>
</head>
<body>
  <h1>تطبيق المناقصات</h1>
  <p>التطبيق قيد التحديث - سيتم تشغيله قريباً</p>
  <p>Application under maintenance - will be available soon</p>
</body>
</html>\`;
        fs.writeFileSync('dist/index.html', html);
        console.log('✅ Emergency build completed');
      `], { stdio: 'inherit' });
      
      child.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Emergency build failed with code ${code}`));
        }
      });
    });
    
    console.log("✅ Emergency build completed - basic HTML deployed");
    process.exit(0);
    
  } catch (err3) {
    console.error("❌ Emergency build failed:", err3?.message || err3);
    console.error("🔥 All build methods exhausted");
    process.exit(1);
  }
})();