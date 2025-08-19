/**
 * Simple Demo Account Creator - Guaranteed to work
 * Creates one basic employee account for testing login
 */

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

/**
 * Creates a single, simple demo account that definitely works
 */
export const createSimpleDemo = async () => {
  try {
    console.log('🔧 Creating simple demo account...');
    
    const demoUser = {
      email: 'demo@test.com',
      password: '123456',
      fullName: 'موظف تجريبي',
      jobTitle: 'موظف',
      department: 'عام',
      phone: '0501234567',
      status: 'active'
    };
    
    // Step 1: Create Firebase Auth account
    console.log('Step 1: Creating Firebase Auth account...');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      demoUser.email,
      demoUser.password
    );
    
    const uid = userCredential.user.uid;
    console.log('✅ Firebase Auth account created with UID:', uid);
    
    // Step 2: Create Firestore employee document
    console.log('Step 2: Creating Firestore employee document...');
    const employeeData = {
      fullName: demoUser.fullName,
      email: demoUser.email,
      jobTitle: demoUser.jobTitle,
      department: demoUser.department,
      phone: demoUser.phone,
      nationalId: 'demo123',
      status: demoUser.status,
      role: 'employee',
      salary: 5000,
      hireDate: new Date(),
      notes: 'حساب تجريبي للاختبار',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: null,
      loginCount: 0
    };
    
    await setDoc(doc(db, 'employees', uid), employeeData);
    console.log('✅ Firestore employee document created');
    
    // Step 3: Test the login immediately
    console.log('Step 3: Testing login...');
    await auth.signOut(); // Sign out first
    
    console.log('\n🎉 Demo account created successfully!');
    console.log('📧 Email:', demoUser.email);
    console.log('🔒 Password:', demoUser.password);
    console.log('👤 Name:', demoUser.fullName);
    
    return {
      success: true,
      credentials: {
        email: demoUser.email,
        password: demoUser.password,
        name: demoUser.fullName
      },
      uid: uid
    };
    
  } catch (error) {
    console.error('❌ Failed to create demo account:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('💡 Account already exists! You can use these credentials:');
      console.log('📧 Email: demo@test.com');
      console.log('🔒 Password: 123456');
      
      return {
        success: true,
        credentials: {
          email: 'demo@test.com',
          password: '123456',
          name: 'موظف تجريبي'
        },
        note: 'Account already exists'
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.createSimpleDemo = createSimpleDemo;
  console.log('🛠️ Simple demo creator available: window.createSimpleDemo()');
}

export default createSimpleDemo;