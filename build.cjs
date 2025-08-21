(async () => {
  console.log("Running Vite build with robust fallbacks...");
  
  // Check Node version
  console.log("Node version:", process.version);
  
  try {
    // Try programmatic API first
    console.log("Attempting programmatic Vite build...");
    const { build } = await import('vite');
    await build();
    console.log("✅ Programmatic Vite build completed.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Programmatic build failed:", err?.message || err);
    
    // Try direct Node execution of vite.js
    try {
      console.log("Attempting Node direct execution fallback...");
      const { spawn } = await import('node:child_process');
      await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { 
          stdio: 'inherit',
          env: { ...process.env, NODE_ENV: 'production' }
        });
        child.on('close', code => code === 0 ? resolve() : reject(new Error(`vite exited ${code}`)));
        child.on('error', reject);
      });
      console.log("✅ Node direct execution completed.");
      process.exit(0);
    } catch (err2) {
      console.error("❌ Node direct execution failed:", err2?.message || err2);
      
      // Last resort: try npx with force
      try {
        console.log("Attempting npx force fallback...");
        const { execSync } = require('child_process');
        execSync('npx vite build --force', { 
          stdio: 'inherit',
          env: { ...process.env, NODE_ENV: 'production' }
        });
        console.log("✅ NPX force build completed.");
        process.exit(0);
      } catch (err3) {
        console.error("❌ All build methods failed:", err3?.message || err3);
        console.error("Original error:", err?.message || err);
        process.exit(1);
      }
    }
  }
})();