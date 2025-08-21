import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  connectFirestoreEmulator
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { 
  getAuth, 
  connectAuthEmulator,
  onAuthStateChanged
} from 'firebase/auth';

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
  console.log('🔥 Initializing Firebase with offline persistence...');
  app = initializeApp(firebaseConfig);
  
  // Initialize Firestore with offline persistence
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      ignoreUndefinedProperties: true
    });
    
    // Connect to emulator in development
    if (import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true' && 
        !('_delegate' in db)) {
      console.log('🔧 Connecting to Firestore emulator...');
      connectFirestoreEmulator(db, 'localhost', 8080);
    }
    
    console.log('✅ Firestore initialized with offline persistence');
  } catch (error) {
    console.error('❌ Firestore initialization error:', error);
    db = null;
  }
  
  // Initialize Storage
  try {
    storage = getStorage(app);
    
    // Connect to emulator in development
    if (import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true') {
      console.log('🔧 Connecting to Storage emulator...');
      connectStorageEmulator(storage, 'localhost', 9199);
    }
    
    console.log('✅ Storage initialized');
  } catch (error) {
    console.error('❌ Storage initialization error:', error);
    storage = null;
  }
  
  // Initialize Auth
  try {
    auth = getAuth(app);
    
    // Connect to emulator in development
    if (import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true') {
      console.log('🔧 Connecting to Auth emulator...');
      connectAuthEmulator(auth, 'http://localhost:9099');
    }
    
    console.log('✅ Auth initialized');
  } catch (error) {
    console.error('❌ Auth initialization error:', error);
    auth = null;
  }
  
  console.log('✅ Firebase initialization completed with offline persistence');
} catch (error) {
  console.error('❌ Critical Firebase initialization error:', error);
  app = null;
  db = null;
  storage = null;
  auth = null;
}

// Enhanced connection test
export const testFirebaseConnection = async () => {
  try {
    if (!db || !storage || !auth) {
      console.log('❌ Firebase services not available');
      return false;
    }
    
    // Test Firestore connectivity
    try {
      await db._delegate._databaseId;
      console.log('✅ Firestore connection test passed');
    } catch (firestoreError) {
      console.error('❌ Firestore connection test failed:', firestoreError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
};

// Preload user data after authentication
export const preloadUserData = async (userId) => {
  if (!db) return false;
  
  try {
    console.log('🔄 Preloading user data for:', userId);
    
    // Import services dynamically to avoid circular dependencies
    const { TenderServiceNew } = await import('./TenderServiceNew.js');
    const { MaterialServiceNew } = await import('./MaterialServiceNew.js');
    
    // Preload in parallel
    await Promise.allSettled([
      TenderServiceNew.getAll({ updateCache: true }),
      MaterialServiceNew.getAllRawMaterials({ updateCache: true }),
      MaterialServiceNew.getAllLocalProducts({ updateCache: true }),
      MaterialServiceNew.getAllForeignProducts({ updateCache: true })
    ]);
    
    console.log('✅ User data preloaded successfully');
    return true;
  } catch (error) {
    console.error('❌ User data preload failed:', error);
    return false;
  }
};

// Global error suppression for Firebase (enhanced)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message) {
    const errorMessage = event.reason.message.toLowerCase();
    
    // Suppress known Firebase errors that don't affect functionality
    if (errorMessage.includes('_getrecaptchaconfig') || 
        errorMessage.includes('client is offline') ||
        errorMessage.includes('auth/network-request-failed') ||
        errorMessage.includes('failed to get document because the client is offline') ||
        errorMessage.includes('the operation was aborted')) {
      console.log('🔧 Suppressed Firebase error:', event.reason.message);
      event.preventDefault();
    }
  }
});

// Enhanced auth state monitoring
let authStateInitialized = false;
export const initializeAuthStateMonitoring = () => {
  if (authStateInitialized || !auth) return;
  
  authStateInitialized = true;
  
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('👤 User authenticated, preloading data...');
      await preloadUserData(user.uid);
    } else {
      console.log('👋 User signed out, clearing caches...');
      // Clear all caches when user signs out
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('firestore_cache_')) {
          localStorage.removeItem(key);
        }
      });
    }
  });
};

console.log('🔥 Firebase services status:', {
  app: !!app,
  database: !!db,
  storage: !!storage,
  auth: !!auth,
  offlinePersistence: !!db
});

export { db, storage, auth };
export default app;