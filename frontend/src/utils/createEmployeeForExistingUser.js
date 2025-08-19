import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Creates an employee document for existing Firebase Auth user
 * Run this in browser console: window.createEmployeeForUser('your-uid')
 */
const createEmployeeForUser = async (uid, userData = {}) => {
  const defaultUserData = {
    fullName: 'أحمد الهيدروليك',
    email: 'hydraulic_ahmed@yahoo.com',
    phone: '966501234567',
    jobTitle: 'مدير النظام',
    department: 'تقنية المعلومات',
    status: 'active',
    role: 'admin',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...userData
  };

  try {
    console.log('🔄 Creating employee document for UID:', uid);
    
    // Create employee document with the provided UID
    await setDoc(doc(db, 'employees', uid), defaultUserData);
    
    console.log('✅ Employee document created successfully!');
    console.log('📊 Employee data:', defaultUserData);
    console.log('🔑 UID:', uid);
    console.log('📧 You can now login with:', defaultUserData.email);
    
    return defaultUserData;
    
  } catch (error) {
    console.error('❌ Error creating employee document:', error);
    throw error;
  }
};

// Quick function to create for the specific user from the screenshot
const createEmployeeForHydraulicAhmed = async () => {
  const uid = 'QvOQb59yLkavA8CfTL5xkqGDqEi2'; // Complete UID from Firebase Console
  
  return await createEmployeeForUser(uid, {
    fullName: 'أحمد الهيدروليك', 
    email: 'hydraulic_ahmed@yahoo.com'
  });
};

// Make functions available on window for testing
if (typeof window !== 'undefined') {
  window.createEmployeeForUser = createEmployeeForUser;
  window.createEmployeeForHydraulicAhmed = createEmployeeForHydraulicAhmed;
}

export { createEmployeeForUser, createEmployeeForHydraulicAhmed };