import { 
  collection, 
  doc, 
  setDoc,
  getDoc,
  updateDoc, 
  serverTimestamp,
  increment 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth, db } from './firebase.js';

const EMPLOYEES_COLLECTION = 'employees';

/**
 * Auth-integrated Employee Service
 * Handles employee creation with Firebase Auth integration
 */
export class AuthEmployeeService {

  /**
   * Create new employee with Firebase Auth account
   * This should be called from admin interface to create employee accounts
   */
  static async createEmployeeWithAuth(employeeData) {
    try {
      console.log('🔧 Creating employee with auth integration:', employeeData);

      // Validate required fields
      if (!employeeData.email || !employeeData.password) {
        throw new Error('Email and password are required for employee creation');
      }

      // Create Firebase Auth user first
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        employeeData.email.trim(),
        employeeData.password
      );

      const uid = userCredential.user.uid;
      console.log('✅ Firebase Auth user created:', uid);

      // Create employee document with the same UID
      const employeeDocData = {
        fullName: employeeData.fullName || '',
        email: employeeData.email.trim(),
        jobTitle: employeeData.jobTitle || '',
        department: employeeData.department || '',
        phone: employeeData.phone || '',
        nationalId: employeeData.nationalId || '',
        status: employeeData.status || 'active',
        role: employeeData.role || 'employee',
        salary: employeeData.salary || null,
        hireDate: employeeData.hireDate || new Date(),
        notes: employeeData.notes || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: null,
        loginCount: 0
      };

      // Save to Firestore using the Auth UID as document ID
      await setDoc(doc(db, EMPLOYEES_COLLECTION, uid), employeeDocData);
      
      console.log('✅ Employee document created in Firestore');

      return {
        id: uid,
        uid: uid,
        ...employeeDocData,
        created: true
      };

    } catch (error) {
      console.error('❌ Error creating employee with auth:', error);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'فشل في إنشاء حساب الموظف';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
          break;
        case 'auth/invalid-email':
          errorMessage = 'البريد الإلكتروني غير صحيح';
          break;
        case 'auth/weak-password':
          errorMessage = 'كلمة المرور ضعيفة. يجب أن تكون 6 أحرف على الأقل';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'خطأ في الاتصال. يرجى المحاولة مرة أخرى';
          break;
        default:
          errorMessage = error.message || 'خطأ غير معروف';
          break;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Get employee by Auth UID
   */
  static async getEmployeeByUid(uid) {
    try {
      const employeeDoc = await getDoc(doc(db, EMPLOYEES_COLLECTION, uid));
      
      if (!employeeDoc.exists()) {
        return null;
      }
      
      return {
        id: uid,
        uid: uid,
        ...employeeDoc.data()
      };
    } catch (error) {
      console.error('❌ Error getting employee by UID:', error);
      throw new Error('فشل في جلب بيانات الموظف');
    }
  }

  /**
   * Update employee data (for current user or admin)
   */
  static async updateEmployee(uid, updateData) {
    try {
      const employeeRef = doc(db, EMPLOYEES_COLLECTION, uid);
      
      const updatePayload = {
        ...updateData,
        updatedAt: serverTimestamp()
      };

      // Remove password field if present (should be handled through Auth)
      delete updatePayload.password;

      await updateDoc(employeeRef, updatePayload);
      
      console.log('✅ Employee updated successfully:', uid);
      return true;
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      throw new Error('فشل في تحديث بيانات الموظف');
    }
  }

  /**
   * Update login tracking (called after successful sign-in)
   */
  static async updateLoginTracking(uid) {
    try {
      const employeeRef = doc(db, EMPLOYEES_COLLECTION, uid);
      
      await updateDoc(employeeRef, {
        lastLoginAt: serverTimestamp(),
        loginCount: increment(1),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Login tracking updated for:', uid);
    } catch (error) {
      console.error('❌ Error updating login tracking:', error);
      // Don't throw error - login tracking is not critical
    }
  }

  /**
   * Deactivate employee account
   */
  static async deactivateEmployee(uid) {
    try {
      await this.updateEmployee(uid, { status: 'inactive' });
      console.log('✅ Employee deactivated:', uid);
      return true;
    } catch (error) {
      console.error('❌ Error deactivating employee:', error);
      throw new Error('فشل في إلغاء تفعيل الموظف');
    }
  }

  /**
   * Reactivate employee account
   */
  static async activateEmployee(uid) {
    try {
      await this.updateEmployee(uid, { status: 'active' });
      console.log('✅ Employee activated:', uid);
      return true;
    } catch (error) {
      console.error('❌ Error activating employee:', error);
      throw new Error('فشل في تفعيل الموظف');
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('✅ Password reset email sent to:', email);
      return true;
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      
      let errorMessage = 'فشل في إرسال رسالة إعادة تعيين كلمة المرور';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'لا يوجد حساب بهذا البريد الإلكتروني';
          break;
        case 'auth/invalid-email':
          errorMessage = 'البريد الإلكتروني غير صحيح';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'محاولات كثيرة جداً. يرجى المحاولة لاحقاً';
          break;
        default:
          errorMessage = error.message || 'خطأ غير معروف';
          break;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Validate employee data before creation
   */
  static validateEmployeeData(employeeData) {
    const errors = {};

    // Required fields
    if (!employeeData.fullName || !employeeData.fullName.trim()) {
      errors.fullName = 'الاسم الكامل مطلوب';
    }

    if (!employeeData.email || !employeeData.email.trim()) {
      errors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/\S+@\S+\.\S+/.test(employeeData.email)) {
      errors.email = 'البريد الإلكتروني غير صحيح';
    }

    if (!employeeData.password) {
      errors.password = 'كلمة المرور مطلوبة';
    } else if (employeeData.password.length < 6) {
      errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    if (!employeeData.phone || !employeeData.phone.trim()) {
      errors.phone = 'رقم الهاتف مطلوب';
    }

    if (!employeeData.hireDate) {
      errors.hireDate = 'تاريخ التوظيف مطلوب';
    }

    // Validate phone number format (basic)
    if (employeeData.phone && !/^[\d+\s()-]+$/.test(employeeData.phone.trim())) {
      errors.phone = 'رقم الهاتف غير صحيح';
    }

    // Validate status
    if (employeeData.status && !['active', 'inactive'].includes(employeeData.status)) {
      errors.status = 'حالة الموظف غير صحيحة';
    }

    return errors;
  }
}

export default AuthEmployeeService;