// Debug Firebase Configuration
// Run this in browser console to check configuration loading

window.debugFirebaseConfig = () => {
  console.log('🔍 Debugging Firebase Configuration...');
  
  // Check environment variables
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };
  
  console.log('📋 Environment Variables:');
  Object.entries(config).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const displayValue = value ? (key === 'apiKey' ? value.substring(0, 10) + '...' : value) : 'MISSING';
    console.log(`${status} ${key}: ${displayValue}`);
  });
  
  // Check for missing values
  const missing = Object.entries(config).filter(([key, value]) => !value);
  if (missing.length > 0) {
    console.error('❌ Missing Firebase configuration:', missing.map(([key]) => key));
    console.log('💡 Make sure .env file exists in frontend/ directory');
    console.log('💡 Make sure Vite dev server is running (npm run dev)');
    console.log('💡 Environment variables must start with VITE_ prefix');
  } else {
    console.log('✅ All Firebase configuration values are present');
  }
  
  return config;
};

// Auto-run on load
console.log('🔧 Firebase Config Debugger loaded');
console.log('Run: debugFirebaseConfig()');

export default window.debugFirebaseConfig;