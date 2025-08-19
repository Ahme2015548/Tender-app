/**
 * Firebase Authentication Diagnostics
 * Helps identify authentication setup issues
 */

import { auth, db } from '../services/firebase';
import { connectAuthEmulator } from 'firebase/auth';

/**
 * Comprehensive Firebase Auth diagnostics
 */
export const diagnoseAuthSetup = async () => {
  console.log('🔍 Firebase Authentication Diagnostics');
  console.log('=====================================');
  
  // Check Firebase Auth instance
  console.log('1. Firebase Auth Instance:');
  console.log('   ✓ Auth object:', auth);
  console.log('   ✓ App name:', auth.app.name);
  console.log('   ✓ Project ID:', auth.app.options.projectId);
  console.log('   ✓ Auth Domain:', auth.app.options.authDomain);
  
  // Check current auth state
  console.log('\n2. Current Auth State:');
  console.log('   ✓ Current User:', auth.currentUser);
  console.log('   ✓ Signed In:', !!auth.currentUser);
  
  // Check environment variables
  console.log('\n3. Environment Configuration:');
  console.log('   ✓ API Key:', import.meta.env.VITE_FIREBASE_API_KEY ? '✓ Set' : '❌ Missing');
  console.log('   ✓ Auth Domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '✓ Set' : '❌ Missing');
  console.log('   ✓ Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✓ Set' : '❌ Missing');
  
  // Test basic auth functionality
  console.log('\n4. Testing Auth Methods:');
  try {
    // Check if createUserWithEmailAndPassword is available
    const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth');
    console.log('   ✓ createUserWithEmailAndPassword: Available');
    console.log('   ✓ signInWithEmailAndPassword: Available');
  } catch (error) {
    console.log('   ❌ Auth methods import failed:', error.message);
  }
  
  // Test Firestore connection
  console.log('\n5. Testing Firestore:');
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    console.log('   ✓ Firestore methods: Available');
    console.log('   ✓ Database object:', db);
  } catch (error) {
    console.log('   ❌ Firestore methods failed:', error.message);
  }
  
  console.log('\n6. Recommendations:');
  console.log('   1. Ensure Email/Password is enabled in Firebase Console');
  console.log('   2. Check that your project ID matches: tender-74a2b');
  console.log('   3. Verify Firestore security rules are deployed');
  console.log('   4. Try creating a test account manually in Firebase Console');
  
  return {
    authConfigured: !!auth,
    projectId: auth.app.options.projectId,
    authDomain: auth.app.options.authDomain,
    currentUser: auth.currentUser,
    environmentOK: !!(import.meta.env.VITE_FIREBASE_API_KEY && 
                     import.meta.env.VITE_FIREBASE_AUTH_DOMAIN && 
                     import.meta.env.VITE_FIREBASE_PROJECT_ID)
  };
};

/**
 * Test creating a user account (diagnostics only)
 */
export const testAccountCreation = async () => {
  console.log('🧪 Testing Account Creation...');
  
  try {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = '123456';
    
    console.log('Attempting to create test account...');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    
    console.log('✅ SUCCESS! Account created:', userCredential.user.uid);
    console.log('This means Firebase Auth is working correctly.');
    
    // Clean up - delete the test user
    await userCredential.user.delete();
    console.log('🧹 Test account cleaned up');
    
    return { success: true, message: 'Firebase Auth is working!' };
    
  } catch (error) {
    console.log('❌ FAILED:', error.code, error.message);
    
    if (error.code === 'auth/configuration-not-found') {
      console.log('💡 SOLUTION: Enable Email/Password authentication in Firebase Console');
    } else if (error.code === 'auth/network-request-failed') {
      console.log('💡 SOLUTION: Check your internet connection');
    } else {
      console.log('💡 SOLUTION: Check Firebase configuration');
    }
    
    return { success: false, error: error.code, message: error.message };
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.diagnoseAuthSetup = diagnoseAuthSetup;
  window.testAccountCreation = testAccountCreation;
  
  console.log('🛠️ Diagnostics available:');
  console.log('- window.diagnoseAuthSetup()');
  console.log('- window.testAccountCreation()');
}

export default {
  diagnoseAuthSetup,
  testAccountCreation
};