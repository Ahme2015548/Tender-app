// Force cache invalidation by injecting timestamp
const timestamp = Date.now();
console.log(`Cache bust timestamp: ${timestamp}`);
process.env.VITE_CACHE_BUST = timestamp;