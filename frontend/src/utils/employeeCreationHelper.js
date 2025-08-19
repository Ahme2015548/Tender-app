import { AuthEmployeeService } from '../services/authEmployeeService';

/**
 * Helper utilities for creating employees with auth integration
 * This should be used from your admin dashboard/employee creation form
 */

/**
 * Create employee with auto-generated secure password
 * Returns the generated password for admin to share with employee
 */
export const createEmployeeWithAutoPassword = async (employeeData) => {
  try {
    // Generate secure password
    const generatedPassword = generateSecurePassword();
    
    const result = await AuthEmployeeService.createEmployeeWithAuth({
      ...employeeData,
      password: generatedPassword
    });

    return {
      ...result,
      generatedPassword, // Include password in response for admin
      success: true
    };
  } catch (error) {
    console.error('❌ Employee creation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate secure password for new employees
 */
export const generateSecurePassword = () => {
  const length = 12;
  const charset = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};

/**
 * Update existing employee form to use auth service
 * This modifies your existing EmployeeForm to work with authentication
 */
export const updateEmployeeFormForAuth = (formData, isEditing = false) => {
  if (isEditing) {
    // For editing, don't include password
    const { password, ...updateData } = formData;
    return {
      updateData,
      requiresPasswordReset: password && password.trim() !== ''
    };
  } else {
    // For new employees, ensure password is included
    if (!formData.password || formData.password.trim() === '') {
      formData.password = generateSecurePassword();
    }
    return {
      createData: formData,
      generatedPassword: formData.password
    };
  }
};

/**
 * Validation helper for employee creation
 */
export const validateEmployeeCreation = (employeeData) => {
  return AuthEmployeeService.validateEmployeeData(employeeData);
};

/**
 * Demo data creator - creates sample employees for testing
 * ⚠️ Remove this in production!
 */
export const createDemoEmployees = async () => {
  const demoEmployees = [
    {
      fullName: 'أحمد محمد السعد',
      email: 'ahmed@company.com',
      password: 'Ahmed123@',
      jobTitle: 'مدير المشاريع',
      department: 'إدارة المشاريع',
      phone: '+966501234567',
      nationalId: 'demo123',
      status: 'active',
      role: 'employee',
      salary: 8000,
      hireDate: new Date('2024-01-15'),
      notes: 'موظف تجريبي للاختبار'
    },
    {
      fullName: 'فاطمة عبدالله الراشد',
      email: 'fatima@company.com',
      password: 'Fatima123@',
      jobTitle: 'محاسبة',
      department: 'المالية',
      phone: '+966507654321',
      nationalId: 'demo456',
      status: 'active',
      role: 'employee',
      salary: 6500,
      hireDate: new Date('2024-02-01'),
      notes: 'موظفة تجريبية للاختبار'
    }
  ];

  const results = [];
  
  for (const employee of demoEmployees) {
    try {
      const result = await AuthEmployeeService.createEmployeeWithAuth(employee);
      results.push({
        success: true,
        employee: result,
        credentials: {
          email: employee.email,
          password: employee.password
        }
      });
      console.log('✅ Demo employee created:', employee.fullName);
    } catch (error) {
      results.push({
        success: false,
        employee: employee.fullName,
        error: error.message
      });
      console.error('❌ Failed to create demo employee:', employee.fullName, error.message);
    }
  }

  return results;
};

export default {
  createEmployeeWithAutoPassword,
  generateSecurePassword,
  updateEmployeeFormForAuth,
  validateEmployeeCreation,
  createDemoEmployees
};