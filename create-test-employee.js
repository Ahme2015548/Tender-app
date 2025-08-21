#!/usr/bin/env node

/**
 * Test Employee Creation Script
 * This script creates a test employee account with Firebase Auth integration
 * Run with: node create-test-employee.js
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Firebase config (you'll need to update this with your actual config)
const firebaseConfig = {
  // Add your Firebase config here
  // You can find this in your Firebase project settings
};

// Test employee data
const TEST_EMPLOYEE = {
  email: 'test@company.com',
  password: 'test123456',
  fullName: 'أحمد محمد الاختبار',
  jobTitle: 'مطور أنظمة',
  department: 'تقنية المعلومات',
  phone: '+966501234567',
  nationalId: '1234567890',
  status: 'active',
  role: 'employee',
  salary: 5000,
  hireDate: new Date(),
  notes: 'حساب تجريبي للاختبار'
};

async function createTestEmployee() {
  try {
    console.log('🔧 Initializing Firebase...');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    console.log('🔧 Creating Firebase Auth user...');
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      TEST_EMPLOYEE.email,
      TEST_EMPLOYEE.password
    );

    const uid = userCredential.user.uid;
    console.log('✅ Firebase Auth user created:', uid);

    console.log('🔧 Creating employee document...');
    
    // Create employee document with the same UID
    const employeeDocData = {
      fullName: TEST_EMPLOYEE.fullName,
      email: TEST_EMPLOYEE.email,
      jobTitle: TEST_EMPLOYEE.jobTitle,
      department: TEST_EMPLOYEE.department,
      phone: TEST_EMPLOYEE.phone,
      nationalId: TEST_EMPLOYEE.nationalId,
      status: TEST_EMPLOYEE.status,
      role: TEST_EMPLOYEE.role,
      salary: TEST_EMPLOYEE.salary,
      hireDate: TEST_EMPLOYEE.hireDate,
      notes: TEST_EMPLOYEE.notes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: null,
      loginCount: 0
    };

    // Save to Firestore using the Auth UID as document ID
    await setDoc(doc(db, 'employees', uid), employeeDocData);
    
    console.log('✅ Employee document created in Firestore');
    console.log('');
    console.log('🎉 TEST EMPLOYEE CREATED SUCCESSFULLY!');
    console.log('');
    console.log('📧 Email:', TEST_EMPLOYEE.email);
    console.log('🔑 Password:', TEST_EMPLOYEE.password);
    console.log('👤 Name:', TEST_EMPLOYEE.fullName);
    console.log('🆔 UID:', uid);
    console.log('');
    console.log('You can now use these credentials to sign in to your application!');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating test employee:', error);
    
    // Handle specific Firebase Auth errors
    switch (error.code) {
      case 'auth/email-already-in-use':
        console.log('');
        console.log('ℹ️  Test employee already exists!');
        console.log('📧 Email:', TEST_EMPLOYEE.email);
        console.log('🔑 Password:', TEST_EMPLOYEE.password);
        console.log('');
        console.log('You can use these credentials to sign in.');
        break;
      case 'auth/invalid-email':
        console.error('Invalid email format');
        break;
      case 'auth/weak-password':
        console.error('Password is too weak');
        break;
      default:
        console.error('Unknown error:', error.message);
        break;
    }
    
    process.exit(1);
  }
}

// Run the script
createTestEmployee();