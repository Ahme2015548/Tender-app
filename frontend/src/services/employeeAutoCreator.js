import { auth, db } from './firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Employee Auto-Creator Service
 * Automatically ensures employee documents exist for authenticated users
 * This prevents rule failures by guaranteeing employee document existence
 */
class EmployeeAutoCreator {
  
  static cache = new Map();
  static creationPromises = new Map(); // Prevent duplicate creation attempts
  
  /**
   * Ensure employee document exists for current user
   * This is the bulletproof approach - always ensure the document exists
   */
  static async ensureEmployeeDocument(user = null) {
    try {
      const currentUser = user || auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }
      
      const uid = currentUser.uid;
      
      // Check cache first
      if (this.cache.has(uid)) {
        const cached = this.cache.get(uid);
        if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
          return cached.employee;
        }
      }
      
      // Prevent duplicate creation attempts
      if (this.creationPromises.has(uid)) {
        return await this.creationPromises.get(uid);
      }
      
      const creationPromise = this.createOrGetEmployee(currentUser);
      this.creationPromises.set(uid, creationPromise);
      
      try {
        const result = await creationPromise;
        this.creationPromises.delete(uid);
        return result;
      } catch (error) {
        this.creationPromises.delete(uid);
        throw error;
      }
      
    } catch (error) {
      console.error('❌ Employee document validation failed:', error);
      throw new Error(`فشل في التحقق من سجل الموظف: ${error.message}`);
    }
  }
  
  /**
   * Create or get existing employee document
   */
  static async createOrGetEmployee(user) {
    const uid = user.uid;
    
    console.log('🔍 Checking employee document for user:', uid);
    
    // Check if employee document exists
    const employeeRef = doc(db, 'employees', uid);
    const employeeDoc = await getDoc(employeeRef);
    
    if (employeeDoc.exists()) {
      const employeeData = employeeDoc.data();
      
      console.log('✅ Employee document found:', {
        uid: uid,
        name: employeeData.fullName || employeeData.name,
        status: employeeData.status,
        email: employeeData.email
      });
      
      // Cache the result
      this.cache.set(uid, {
        employee: employeeData,
        timestamp: Date.now()
      });
      
      return employeeData;
    }
    
    // Employee document doesn't exist - create it automatically
    console.log('⚠️ Employee document not found, creating automatically...');
    
    return await this.createEmployeeDocument(user);
  }
  
  /**
   * Create employee document from authenticated user data
   */
  static async createEmployeeDocument(user) {
    const uid = user.uid;
    
    // Extract name from email or display name
    const email = user.email || '';
    const displayName = user.displayName || '';
    const nameFromEmail = email.split('@')[0] || 'مستخدم';
    
    const employeeData = {
      fullName: displayName || nameFromEmail,
      name: displayName || nameFromEmail,
      email: email,
      status: 'active', // Default to active
      role: 'employee',
      department: 'عام', // General department
      jobTitle: 'موظف',
      phone: '',
      nationalId: '',
      hireDate: new Date().toISOString(), // Convert to ISO string to avoid Firestore issues
      salary: 0, // Default salary
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'auto-system',
      autoCreated: true, // Flag to indicate auto-creation
      uid: uid // Store UID for reference
    };
    
    console.log('🔄 Creating employee document:', employeeData);
    
    const employeeRef = doc(db, 'employees', uid);
    await setDoc(employeeRef, employeeData);
    
    console.log('✅ Employee document created successfully for:', uid);
    
    // Cache the result
    this.cache.set(uid, {
      employee: employeeData,
      timestamp: Date.now()
    });
    
    // Log the auto-creation event
    this.logAutoCreation(uid, email);
    
    return employeeData;
  }
  
  /**
   * Log auto-creation event for monitoring
   */
  static logAutoCreation(uid, email) {
    console.log('🔒 Auto-Creation Event:', {
      type: 'EMPLOYEE_AUTO_CREATED',
      uid: uid,
      email: email,
      timestamp: new Date().toISOString(),
      reason: 'Missing employee document for authenticated user'
    });
  }
  
  /**
   * Clear cache for specific user or all users
   */
  static clearCache(uid = null) {
    if (uid) {
      this.cache.delete(uid);
    } else {
      this.cache.clear();
    }
  }
  
  /**
   * Validate employee status (with auto-creation fallback)
   */
  static async validateEmployee(user = null) {
    try {
      const employee = await this.ensureEmployeeDocument(user);
      
      // Check if employee is active (or auto-created)
      const isValid = employee.status === 'active' || employee.autoCreated;
      
      return {
        isValid: isValid,
        employee: employee,
        autoCreated: employee.autoCreated || false
      };
      
    } catch (error) {
      console.error('❌ Employee validation failed:', error);
      return {
        isValid: false,
        employee: null,
        error: error.message
      };
    }
  }
}

// Global access for debugging
if (typeof window !== 'undefined') {
  window.EmployeeAutoCreator = EmployeeAutoCreator;
}

export default EmployeeAutoCreator;