/**
 * Employee Seed Data for Development/Testing
 * Creates demo employees with realistic Arabic data
 */

import { EmployeeService } from '../services/employeeService';

export const demoEmployees = [
  {
    fullName: 'أحمد محمد العلي',
    jobTitle: 'مدير الموارد البشرية',
    department: 'الموارد البشرية',
    phone: '+966501234567',
    email: 'ahmed.ali@modernbin.com',
    nationalId: '1023456789',
    status: 'active',
    salary: 12000,
    hireDate: new Date('2022-01-15'),
    notes: 'مدير متميز مع خبرة 8 سنوات في إدارة الموارد البشرية'
  },
  {
    fullName: 'فاطمة خالد السالم',
    jobTitle: 'محاسبة قانونية',
    department: 'المحاسبة',
    phone: '+966502345678',
    email: 'fatima.salem@modernbin.com',
    nationalId: '1123456789',
    status: 'active',
    salary: 9500,
    hireDate: new Date('2021-05-20'),
    notes: 'محاسبة معتمدة مع خبرة في الأنظمة المالية المتقدمة'
  },
  {
    fullName: 'عبدالله سعد الرشيد',
    jobTitle: 'مهندس مدني',
    department: 'الهندسة',
    phone: '+966503456789',
    email: 'abdullah.rashid@modernbin.com',
    nationalId: '1223456789',
    status: 'active',
    salary: 11000,
    hireDate: new Date('2020-03-10'),
    notes: 'مهندس مدني مع خبرة في مشاريع الحاويات والإنشاءات'
  },
  {
    fullName: 'نورا عبدالرحمن القحطاني',
    jobTitle: 'مسؤولة التسويق',
    department: 'التسويق',
    phone: '+966504567890',
    email: 'nora.qahtani@modernbin.com',
    nationalId: '1323456789',
    status: 'active',
    salary: 8500,
    hireDate: new Date('2022-08-01'),
    notes: 'خبيرة في التسويق الرقمي ووسائل التواصل الاجتماعي'
  },
  {
    fullName: 'محمد عبدالعزيز الدوسري',
    jobTitle: 'فني صيانة',
    department: 'الصيانة',
    phone: '+966505678901',
    email: 'mohammed.dosari@modernbin.com',
    nationalId: '1423456789',
    status: 'active',
    salary: 6500,
    hireDate: new Date('2023-02-15'),
    notes: 'فني صيانة متخصص في معدات الحاويات والآلات الثقيلة'
  },
  {
    fullName: 'سارة أحمد البكري',
    jobTitle: 'مطورة برمجيات',
    department: 'تقنية المعلومات',
    phone: '+966506789012',
    email: 'sara.bakri@modernbin.com',
    nationalId: '1523456789',
    status: 'active',
    salary: 10500,
    hireDate: new Date('2021-11-30'),
    notes: 'مطورة متخصصة في React و Node.js مع خبرة في قواعد البيانات'
  },
  {
    fullName: 'خالد يوسف الحربي',
    jobTitle: 'مشرف أمن',
    department: 'الأمن والسلامة',
    phone: '+966507890123',
    email: 'khalid.harbi@modernbin.com',
    nationalId: '1623456789',
    status: 'active',
    salary: 7000,
    hireDate: new Date('2020-09-12'),
    notes: 'مشرف أمن معتمد مع دورات في السلامة المهنية'
  },
  {
    fullName: 'مريم صالح العتيبي',
    jobTitle: 'سكرتيرة تنفيذية',
    department: 'الإدارة العامة',
    phone: '+966508901234',
    email: 'mariam.otaibi@modernbin.com',
    nationalId: '1723456789',
    status: 'inactive',
    salary: 5500,
    hireDate: new Date('2019-07-08'),
    notes: 'سكرتيرة متمرسة، حالياً في إجازة أمومة'
  }
];

/**
 * Seed the database with demo employees
 * @returns {Promise<Object>} Results of the seeding process
 */
export const seedEmployeesData = async () => {
  try {
    console.log('🌱 Starting employees data seeding...');
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const employeeData of demoEmployees) {
      try {
        // Check if employee already exists by email
        if (employeeData.email) {
          const existingEmployees = await EmployeeService.searchEmployees(employeeData.email);
          const exists = existingEmployees.some(emp => emp.email === employeeData.email);
          
          if (exists) {
            console.log(`⏭️  Employee already exists: ${employeeData.fullName}`);
            continue;
          }
        }
        
        await EmployeeService.createEmployee(employeeData);
        results.success++;
        console.log(`✅ Created employee: ${employeeData.fullName}`);
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to create ${employeeData.fullName}: ${error.message}`);
        console.error(`❌ Failed to create employee ${employeeData.fullName}:`, error.message);
      }
    }
    
    console.log('🎉 Employee seeding completed!');
    console.log(`✅ Successfully created: ${results.success} employees`);
    console.log(`❌ Failed to create: ${results.failed} employees`);
    
    if (results.errors.length > 0) {
      console.log('Errors encountered:');
      results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    return results;
  } catch (error) {
    console.error('💥 Employee seeding failed:', error);
    throw new Error(`فشل في إنشاء بيانات الموظفين التجريبية: ${error.message}`);
  }
};

/**
 * Clear all demo employees from the database
 * @returns {Promise<Object>} Results of the clearing process
 */
export const clearDemoEmployees = async () => {
  try {
    console.log('🧹 Clearing demo employees...');
    
    const results = {
      deleted: 0,
      errors: []
    };
    
    for (const employeeData of demoEmployees) {
      try {
        if (employeeData.email) {
          const existingEmployees = await EmployeeService.searchEmployees(employeeData.email);
          const employee = existingEmployees.find(emp => emp.email === employeeData.email);
          
          if (employee) {
            await EmployeeService.deleteEmployee(employee.id);
            results.deleted++;
            console.log(`🗑️  Deleted employee: ${employeeData.fullName}`);
          }
        }
      } catch (error) {
        results.errors.push(`Failed to delete ${employeeData.fullName}: ${error.message}`);
        console.error(`❌ Failed to delete employee ${employeeData.fullName}:`, error.message);
      }
    }
    
    console.log(`🧹 Cleared ${results.deleted} demo employees`);
    return results;
  } catch (error) {
    console.error('💥 Failed to clear demo employees:', error);
    throw new Error(`فشل في حذف بيانات الموظفين التجريبية: ${error.message}`);
  }
};

export default {
  demoEmployees,
  seedEmployeesData,
  clearDemoEmployees
};