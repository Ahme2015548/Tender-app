// build.cjs
(async () => {
  console.log("Running Vite build via programmatic API...");
  try {
    const { build } = await import('vite');
    await build();
    console.log("Programmatic Vite build completed.");
    process.exit(0);
  } catch (err) {
    console.error("Programmatic build failed:", err?.message || err);
    try {
      const { spawn } = await import('node:child_process');
      await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
          stdio: 'inherit',
        });
        child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`vite exited ${code}`)));
      });
      console.log("Fallback build completed.");
      process.exit(0);
    } catch (err2) {
      console.error("All build methods failed:", err2?.message || err2);
      process.exit(1);
    }
  }
})();