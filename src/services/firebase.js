import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Firebase configuration with error handling
let firebaseConfig;
try {
  firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCF4OZxfGELDmooid5mAL51l0t7Cxx6W3k",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tender-74a2b.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tender-74a2b",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tender-74a2b.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "300993197682",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:300993197682:web:e75fab78c4d6afc91ff4eb",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-D2CYMMNSB8"
  };
} catch (error) {
  console.error('Error loading Firebase config:', error);
  firebaseConfig = {};
}

// Initialize Firebase with comprehensive error handling
let app, db, storage, auth;

try {
  console.log('Initializing Firebase...');
  app = initializeApp(firebaseConfig);
  
  try {
    db = getFirestore(app);
    console.log('✅ Firestore initialized');
  } catch (error) {
    console.error('Firestore initialization error:', error);
    db = null;
  }
  
  try {
    storage = getStorage(app);
    console.log('✅ Storage initialized');
  } catch (error) {
    console.error('Storage initialization error:', error);
    storage = null;
  }
  
  try {
    auth = getAuth(app);
    console.log('✅ Auth initialized');
  } catch (error) {
    console.error('Auth initialization error:', error);
    auth = null;
  }
  
  console.log('✅ Firebase initialization completed');
} catch (error) {
  console.error('❌ Critical Firebase initialization error:', error);
  app = null;
  db = null;
  storage = null;
  auth = null;
}

// Export services (will be null if failed)
export { db, storage, auth };

// Connection test
export const testFirebaseConnection = async () => {
  try {
    if (!db || !storage || !auth) {
      console.log('Firebase services not available');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
};

// Global error suppression for Firebase
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message) {
    if (event.reason.message.includes('_getRecaptchaConfig') || 
        event.reason.message.includes('client is offline') ||
        event.reason.message.includes('auth/network-request-failed')) {
      console.log('🔧 Suppressed Firebase error:', event.reason.message);
      event.preventDefault();
    }
  }
});

console.log('🔥 Firebase services status:', {
  app: !!app,
  database: !!db,
  storage: !!storage,
  auth: !!auth
});

export default app;