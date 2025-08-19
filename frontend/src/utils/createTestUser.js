import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

/**
 * Creates a test user for debugging login issues
 * Run this in browser console: window.createTestUser()
 */
const createTestUser = async () => {
  const email = 'test@example.com';
  const password = '123456';
  const userData = {
    fullName: 'مستخدم تجريبي',
    email: email,
    phone: '966501234567',
    jobTitle: 'موظف',
    department: 'تقنية المعلومات',
    status: 'active',
    role: 'employee',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    console.log('🔄 Creating test user...');
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    console.log('✅ Auth user created:', uid);
    
    // Create employee document with the Auth UID
    await setDoc(doc(db, 'employees', uid), userData);
    
    console.log('✅ Employee document created with UID:', uid);
    console.log('✅ Test user ready:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   Name:', userData.fullName);
    console.log('   Status:', userData.status);
    
    return {
      uid,
      email,
      password,
      userData
    };
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('💡 User already exists. You can try logging in with:');
      console.log('   Email:', email);
      console.log('   Password:', password);
    }
    
    throw error;
  }
};

// Make it available on window for testing
if (typeof window !== 'undefined') {
  window.createTestUser = createTestUser;
}

export default createTestUser;