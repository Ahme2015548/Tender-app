/**
 * Migration Utility: Create Firebase Auth accounts for existing employees
 * This converts your existing employee records to work with the new authentication system
 */

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { EmployeeService } from '../services/employeeService';

/**
 * Migrate existing employees to Firebase Auth
 * Creates Firebase Auth accounts for employees that exist in Firestore but don't have Auth accounts
 */
export const migrateExistingEmployeesToAuth = async () => {
  try {
    console.log('🔄 Starting employee migration to Firebase Auth...');
    
    // Get all existing employees from your current system
    const existingEmployees = await EmployeeService.getAllEmployees({ limit: 1000 });
    console.log(`📊 Found ${existingEmployees.employees.length} existing employees`);
    
    const results = [];
    
    // Create default password for existing employees (they can change it later)
    const defaultPassword = 'Employee123';
    
    for (const employee of existingEmployees.employees) {
      try {
        console.log(`🔧 Processing employee: ${employee.fullName}`);
        
        // Skip if no email
        if (!employee.email || !employee.email.trim()) {
          console.log(`⏭️ Skipping ${employee.fullName} - no email address`);
          results.push({
            success: false,
            employee: employee.fullName,
            error: 'No email address',
            credentials: null
          });
          continue;
        }
        
        // Create Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          employee.email.trim(),
          defaultPassword
        );
        
        const uid = userCredential.user.uid;
        console.log(`✅ Created Auth account for ${employee.fullName} with UID: ${uid}`);
        
        // Create/update employee document with the Auth UID
        const employeeAuthData = {
          fullName: employee.fullName || '',
          email: employee.email.trim(),
          jobTitle: employee.jobTitle || '',
          department: employee.department || '',
          phone: employee.phone || '',
          nationalId: employee.nationalId || '',
          status: employee.status || 'active',
          role: employee.role || 'employee',
          salary: employee.salary || null,
          hireDate: employee.hireDate || new Date(),
          notes: employee.notes || '',
          createdAt: employee.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: null,
          loginCount: 0,
          // Migration metadata
          migratedAt: serverTimestamp(),
          originalId: employee.id // Keep reference to original document
        };
        
        // Save to Firestore with Auth UID as document ID
        await setDoc(doc(db, 'employees', uid), employeeAuthData);
        console.log(`📝 Updated Firestore employee document for ${employee.fullName}`);
        
        results.push({
          success: true,
          employee: {
            uid: uid,
            fullName: employee.fullName,
            email: employee.email,
            jobTitle: employee.jobTitle,
            department: employee.department
          },
          credentials: {
            email: employee.email,
            password: defaultPassword
          }
        });
        
        console.log(`✅ Successfully migrated: ${employee.fullName}`);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${employee.fullName}:`, error.message);
        
        let errorMessage = error.message;
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'Email already has a Firebase Auth account';
        }
        
        results.push({
          success: false,
          employee: employee.fullName,
          error: errorMessage,
          credentials: {
            email: employee.email,
            password: defaultPassword,
            note: 'May already exist - try logging in'
          }
        });
      }
    }
    
    // Summary
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successful.length} employees`);
    console.log(`❌ Failed to migrate: ${failed.length} employees`);
    
    if (successful.length > 0) {
      console.log('\n🔑 Login Credentials (Default Password: Employee123):');
      console.table(successful.map(r => ({
        Name: r.employee.fullName,
        Email: r.credentials.email,
        Password: r.credentials.password,
        Department: r.employee.department
      })));
      
      console.log('\n📋 You can now log in with any of the above credentials!');
      console.log('💡 Default password for all accounts: Employee123');
      console.log('🔒 Users should change their password after first login');
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Failed Employees:');
      failed.forEach(f => {
        if (f.credentials && f.credentials.note) {
          console.log(`- ${f.employee}: ${f.error} (${f.credentials.note})`);
        } else {
          console.log(`- ${f.employee}: ${f.error}`);
        }
      });
    }
    
    return {
      successful,
      failed,
      totalProcessed: results.length
    };
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw new Error(`فشل في ترحيل بيانات الموظفين: ${error.message}`);
  }
};

/**
 * Create Auth account for specific employee by email
 */
export const migrateSpecificEmployee = async (email, password = 'Employee123') => {
  try {
    console.log(`🔧 Migrating specific employee: ${email}`);
    
    // Get employee by email
    const allEmployees = await EmployeeService.getAllEmployees({ limit: 1000 });
    const employee = allEmployees.employees.find(emp => emp.email === email);
    
    if (!employee) {
      throw new Error(`Employee not found with email: ${email}`);
    }
    
    // Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // Create employee document with Auth UID
    const employeeAuthData = {
      fullName: employee.fullName || '',
      email: employee.email.trim(),
      jobTitle: employee.jobTitle || '',
      department: employee.department || '',
      phone: employee.phone || '',
      nationalId: employee.nationalId || '',
      status: employee.status || 'active',
      role: employee.role || 'employee',
      salary: employee.salary || null,
      hireDate: employee.hireDate || new Date(),
      notes: employee.notes || '',
      createdAt: employee.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: null,
      loginCount: 0,
      migratedAt: serverTimestamp(),
      originalId: employee.id
    };
    
    await setDoc(doc(db, 'employees', uid), employeeAuthData);
    
    console.log(`✅ Successfully migrated ${employee.fullName}`);
    console.log(`🔑 Credentials: ${email} / ${password}`);
    
    return {
      success: true,
      employee: employee.fullName,
      credentials: { email, password },
      uid
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Make functions available globally in development
if (process.env.NODE_ENV === 'development') {
  window.migrateExistingEmployeesToAuth = migrateExistingEmployeesToAuth;
  window.migrateSpecificEmployee = migrateSpecificEmployee;
  
  console.log('🛠️ Migration utilities available:');
  console.log('- window.migrateExistingEmployeesToAuth()');
  console.log('- window.migrateSpecificEmployee(email, password)');
}

export default {
  migrateExistingEmployeesToAuth,
  migrateSpecificEmployee
};