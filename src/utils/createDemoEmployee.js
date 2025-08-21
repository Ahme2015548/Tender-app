/**
 * Demo Employee Creator
 * ⚠️ FOR DEVELOPMENT/TESTING ONLY - Remove in production!
 * 
 * This utility creates demo employees for testing the authentication system.
 * 
 * Usage:
 * 1. Open browser console on your app
 * 2. Import this function
 * 3. Call createDemoEmployees()
 * 4. Use the returned credentials to test login
 */

import { AuthEmployeeService } from '../services/authEmployeeService';

/**
 * Creates demo employees with predefined credentials
 * Returns array of created employees with their login credentials
 */
export const createDemoEmployees = async () => {
  const demoEmployees = [
    {
      fullName: 'أحمد محمد السعد',
      email: 'ahmed@tender.com',
      password: 'Ahmed123',
      jobTitle: 'مدير المشاريع',
      department: 'إدارة المشاريع',
      phone: '+966501234567',
      nationalId: 'demo123456',
      status: 'active',
      role: 'employee',
      salary: 8000,
      hireDate: new Date('2024-01-15'),
      notes: 'موظف تجريبي للاختبار - مدير مشاريع'
    },
    {
      fullName: 'فاطمة عبدالله الراشد',
      email: 'fatima@tender.com',
      password: 'Fatima123',
      jobTitle: 'محاسبة أولى',
      department: 'المالية والمحاسبة',
      phone: '+966507654321',
      nationalId: 'demo789012',
      status: 'active',
      role: 'employee',
      salary: 6500,
      hireDate: new Date('2024-02-01'),
      notes: 'موظفة تجريبية للاختبار - محاسبة'
    },
    {
      fullName: 'خالد عبدالعزيز المحمد',
      email: 'khalid@tender.com',
      password: 'Khalid123',
      jobTitle: 'مطور نظم',
      department: 'تقنية المعلومات',
      phone: '+966512345678',
      nationalId: 'demo345678',
      status: 'active',
      role: 'employee',
      salary: 7500,
      hireDate: new Date('2024-03-10'),
      notes: 'موظف تجريبي للاختبار - مطور'
    },
    {
      fullName: 'نورا سالم الأحمد',
      email: 'nora@tender.com',
      password: 'Nora123',
      jobTitle: 'منسقة مناقصات',
      department: 'المناقصات والمشتريات',
      phone: '+966509876543',
      nationalId: 'demo901234',
      status: 'active',
      role: 'employee',
      salary: 5500,
      hireDate: new Date('2024-04-05'),
      notes: 'موظفة تجريبية للاختبار - منسقة مناقصات'
    }
  ];

  const results = [];
  
  console.log('🔧 Creating demo employees...');
  
  for (const employee of demoEmployees) {
    try {
      console.log(`📝 Creating employee: ${employee.fullName}`);
      
      const result = await AuthEmployeeService.createEmployeeWithAuth(employee);
      
      results.push({
        success: true,
        employee: {
          uid: result.uid,
          fullName: employee.fullName,
          email: employee.email,
          jobTitle: employee.jobTitle,
          department: employee.department
        },
        credentials: {
          email: employee.email,
          password: employee.password
        }
      });
      
      console.log(`✅ Created: ${employee.fullName} (${employee.email})`);
      
    } catch (error) {
      console.error(`❌ Failed to create ${employee.fullName}:`, error.message);
      
      results.push({
        success: false,
        employee: employee.fullName,
        error: error.message,
        credentials: {
          email: employee.email,
          password: employee.password
        }
      });
    }
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log('\n📊 Demo Employee Creation Summary:');
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n🔑 Login Credentials:');
    console.table(successful.map(r => ({
      Name: r.employee.fullName,
      Email: r.credentials.email,
      Password: r.credentials.password,
      Department: r.employee.department
    })));
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Employees:');
    failed.forEach(f => {
      console.log(`- ${f.employee}: ${f.error}`);
    });
  }

  return results;
};

/**
 * Creates a single demo employee with custom data
 */
export const createCustomDemoEmployee = async (employeeData) => {
  try {
    console.log('🔧 Creating custom demo employee...');
    
    const result = await AuthEmployeeService.createEmployeeWithAuth(employeeData);
    
    console.log('✅ Custom demo employee created:', {
      uid: result.uid,
      name: employeeData.fullName,
      email: employeeData.email
    });
    
    return {
      success: true,
      employee: result,
      credentials: {
        email: employeeData.email,
        password: employeeData.password
      }
    };
    
  } catch (error) {
    console.error('❌ Failed to create custom demo employee:', error.message);
    
    return {
      success: false,
      error: error.message,
      credentials: {
        email: employeeData.email,
        password: employeeData.password
      }
    };
  }
};

/**
 * Quick test login function
 */
export const testLogin = async (email, password) => {
  try {
    console.log(`🔐 Testing login for: ${email}`);
    
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const { auth } = await import('../services/firebase');
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    console.log('✅ Login test successful:', userCredential.user.email);
    
    // Sign out immediately after test
    await userCredential.user.auth.signOut();
    
    return { success: true, uid: userCredential.user.uid };
    
  } catch (error) {
    console.error('❌ Login test failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Make functions available globally in development
if (process.env.NODE_ENV === 'development') {
  window.createDemoEmployees = createDemoEmployees;
  window.createCustomDemoEmployee = createCustomDemoEmployee;
  window.testLogin = testLogin;
  
  console.log('🛠️ Demo utilities available:');
  console.log('- window.createDemoEmployees()');
  console.log('- window.createCustomDemoEmployee(data)');
  console.log('- window.testLogin(email, password)');
}

export default {
  createDemoEmployees,
  createCustomDemoEmployee,
  testLogin
};