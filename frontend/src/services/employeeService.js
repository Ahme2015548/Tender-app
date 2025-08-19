import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll 
} from 'firebase/storage';
import { 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { db, storage, auth } from './firebase.js';
import { generateId, ENTITY_PREFIXES } from '../utils/idGenerator.js';
import SecureFirebaseService from './secureFirebaseService.js';

const EMPLOYEES_COLLECTION = 'employees';
const EMPLOYEE_DOCUMENTS_SUBCOLLECTION = 'documents';

// Employee ID generator with EMP-YYYYMMDD-XXXX pattern
export const generateEmployeeId = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  
  return `EMP-${year}${month}${day}-${randomSuffix}`;
};

export class EmployeeService {
  
  static async getAllEmployees(options = {}) {
    try {
      console.log('🔄 Fetching all employees from Firestore...');
      const { search, filters = {}, sort = 'updatedAt', page = 1, limit = 30 } = options;
      
      // Use secure Firebase service for authenticated access
      let queryConstraints = [];
      
      // Try different sorting strategies since some fields might be missing
      try {
        if (sort === 'name') {
          queryConstraints.push(orderBy('fullName', 'asc'));
        } else if (sort === 'hireDate') {
          queryConstraints.push(orderBy('hireDate', 'desc'));
        } else {
          // Try createdAt first, then updatedAt as fallback
          queryConstraints.push(orderBy('createdAt', 'desc'));
        }
      } catch (sortError) {
        console.warn('⚠️ Sorting failed, using basic query:', sortError.message);
        // Fallback to simple query without ordering
        queryConstraints = [];
      }
      
      const querySnapshot = await SecureFirebaseService.secureGetDocs(EMPLOYEES_COLLECTION, queryConstraints);
      console.log('📊 Firestore query results:', querySnapshot.size, 'documents');
      
      let employees = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📄 Processing employee document:', doc.id, data.fullName || 'Unknown');
        return {
          id: doc.id,
          internalId: data.internalId || generateEmployeeId(),
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          hireDate: data.hireDate?.toDate()
        };
      });

      console.log('✅ Processed employees:', employees.length, 'total');

      // Client-side filtering for search
      if (search && search.trim()) {
        const searchLower = search.toLowerCase();
        employees = employees.filter(employee => 
          employee.fullName?.toLowerCase().includes(searchLower) ||
          employee.department?.toLowerCase().includes(searchLower) ||
          employee.jobTitle?.toLowerCase().includes(searchLower) ||
          employee.email?.toLowerCase().includes(searchLower) ||
          employee.phone?.includes(search) ||
          employee.nationalId?.includes(search)
        );
      }

      // Client-side filtering by department
      if (filters.department && filters.department !== 'all') {
        employees = employees.filter(employee => 
          employee.department === filters.department
        );
      }

      // Client-side filtering by status
      if (filters.status && filters.status !== 'all') {
        employees = employees.filter(employee => 
          employee.status === filters.status
        );
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedEmployees = employees.slice(startIndex, endIndex);

      return {
        employees: paginatedEmployees,
        totalCount: employees.length,
        totalPages: Math.ceil(employees.length / limit),
        currentPage: page
      };
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw new Error('فشل في جلب بيانات الموظفين');
    }
  }

  static async createEmployee(employeeData) {
    try {
      // Validate required fields
      if (!employeeData.email || !employeeData.email.trim()) {
        throw new Error('البريد الإلكتروني مطلوب لإنشاء حساب الموظف');
      }
      
      if (!employeeData.nationalId || !employeeData.nationalId.trim()) {
        throw new Error('كلمة المرور مطلوبة لإنشاء حساب الموظف');
      }

      // Generate unique employee ID
      let internalId = generateEmployeeId();
      
      // Check for ID uniqueness (retry up to 5 times)
      let attempts = 0;
      while (attempts < 5) {
        const existing = await this.getEmployeeByInternalId(internalId);
        if (!existing) break;
        internalId = generateEmployeeId();
        attempts++;
      }
      
      if (attempts === 5) {
        throw new Error('فشل في توليد معرف فريد للموظف');
      }

      console.log('🔄 Creating Firebase Auth user for employee...');

      // Create Firebase Auth user first
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        employeeData.email.trim(), 
        employeeData.nationalId // Using nationalId as password
      );

      const uid = userCredential.user.uid;
      console.log('✅ Firebase Auth user created:', uid);

      // Update the user profile with display name
      await updateProfile(userCredential.user, {
        displayName: employeeData.fullName
      });

      // Create employee document with the Auth UID as document ID
      const employeeDoc = {
        ...employeeData,
        internalId: internalId,
        status: employeeData.status || 'active',
        role: employeeData.role || 'employee',
        hireDate: employeeData.hireDate ? new Date(employeeData.hireDate) : new Date(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Use secure Firebase service to create employee document with the Auth UID
      await SecureFirebaseService.createEmployeeDoc(employeeDoc, uid);
      
      console.log('✅ Employee document created with UID:', uid);
      
      return { id: uid, internalId, uid };
      
    } catch (error) {
      console.error('Error creating employee:', error);
      
      // Provide more specific error messages
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('البريد الإلكتروني مستخدم بالفعل');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('صيغة البريد الإلكتروني غير صحيحة');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('كلمة المرور ضعيفة جداً - يجب أن تكون 6 أحرف على الأقل');
      }
      
      throw new Error(error.message || 'فشل في إنشاء الموظف');
    }
  }

  static async updateEmployee(employeeId, employeeData) {
    try {
      const updateData = {
        ...employeeData
      };
      
      // Convert hireDate to Firestore timestamp if provided
      if (employeeData.hireDate) {
        updateData.hireDate = new Date(employeeData.hireDate);
      }
      
      // Check if updating own record or requires active employee status
      const currentUID = auth.currentUser?.uid;
      
      if (employeeId === currentUID) {
        // Updating own employee record - allowed for login tracking
        await SecureFirebaseService.updateOwnEmployeeDoc(updateData);
      } else {
        // Updating other employee record - requires active employee status
        await SecureFirebaseService.secureUpdateDoc(EMPLOYEES_COLLECTION, employeeId, updateData);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating employee:', error);
      throw new Error('فشل في تحديث بيانات الموظف');
    }
  }

  static async getEmployeeById(employeeId) {
    try {
      // Check if accessing own employee record
      const currentUID = auth.currentUser?.uid;
      
      let docSnap;
      if (employeeId === currentUID) {
        // Accessing own employee record - no active employee validation needed
        docSnap = await SecureFirebaseService.getOwnEmployeeDoc();
      } else {
        // Accessing other employee record - requires active employee status
        docSnap = await SecureFirebaseService.secureGetDoc(EMPLOYEES_COLLECTION, employeeId);
      }
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          internalId: data.internalId || generateEmployeeId(),
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          hireDate: data.hireDate?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching employee by ID:', error);
      throw new Error('فشل في جلب بيانات الموظف');
    }
  }

  static async getEmployeeByInternalId(internalId) {
    try {
      const employeesRef = collection(db, EMPLOYEES_COLLECTION);
      const q = query(employeesRef, where('internalId', '==', internalId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          hireDate: data.hireDate?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching employee by internal ID:', error);
      throw new Error('فشل في جلب بيانات الموظف');
    }
  }

  static async updateEmployeeByInternalId(internalId, employeeData) {
    try {
      const employee = await this.getEmployeeByInternalId(internalId);
      if (!employee) {
        throw new Error('الموظف غير موجود');
      }
      
      return await this.updateEmployee(employee.id, employeeData);
    } catch (error) {
      console.error('Error updating employee by internal ID:', error);
      throw new Error('فشل في تحديث بيانات الموظف');
    }
  }

  static async deleteEmployee(employeeId) {
    try {
      const employeeRef = doc(db, EMPLOYEES_COLLECTION, employeeId);
      await deleteDoc(employeeRef);
      return true;
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw new Error('فشل في حذف الموظف');
    }
  }

  static async deleteEmployeeByInternalId(internalId) {
    try {
      const employee = await this.getEmployeeByInternalId(internalId);
      if (!employee) {
        throw new Error('الموظف غير موجود');
      }
      
      return await this.deleteEmployee(employee.id);
    } catch (error) {
      console.error('Error deleting employee by internal ID:', error);
      throw new Error('فشل في حذف الموظف');
    }
  }

  static async searchEmployees(searchTerm) {
    try {
      const employeesRef = collection(db, EMPLOYEES_COLLECTION);
      const querySnapshot = await getDocs(employeesRef);
      
      const allEmployees = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateEmployeeId(),
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          hireDate: data.hireDate?.toDate()
        };
      });

      // Client-side filtering for Arabic/English names
      const filteredEmployees = allEmployees.filter(employee => 
        employee.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.phone?.includes(searchTerm) ||
        employee.nationalId?.includes(searchTerm)
      );

      return filteredEmployees;
    } catch (error) {
      console.error('Error searching employees:', error);
      throw new Error('فشل في البحث عن الموظفين');
    }
  }

  // File Upload Functions - Updated for security compliance
  static async uploadEmployeeFile(internalId, file, customFileName = null) {
    try {
      // Validate user is authenticated
      const currentUID = SecureFirebaseService.getCurrentUserUID();
      
      const fileName = customFileName || file.name;
      // Use 'uploads' folder as per security rules (not employee-specific folders)
      const timestamp = Date.now();
      const filePath = `uploads/employee_${internalId}_${timestamp}_${fileName}`;
      const storageRef = ref(storage, filePath);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Save file metadata to Firestore subcollection using secure service
      const employee = await this.getEmployeeByInternalId(internalId);
      if (!employee) {
        throw new Error('الموظف غير موجود');
      }
      
      const documentData = {
        name: fileName,
        originalName: file.name,
        path: filePath,
        url: downloadURL,
        type: file.type,
        size: file.size,
        uploadedBy: currentUID,
        uploadedAt: new Date().toISOString()
      };
      
      // Use secure service for Firestore operations
      await SecureFirebaseService.validateActiveEmployee();
      const documentsRef = collection(db, EMPLOYEES_COLLECTION, employee.id, EMPLOYEE_DOCUMENTS_SUBCOLLECTION);
      const docRef = await addDoc(documentsRef, documentData);
      
      return {
        id: docRef.id,
        url: downloadURL,
        path: filePath,
        ...documentData
      };
    } catch (error) {
      console.error('Error uploading employee file:', error);
      throw new Error('فشل في رفع الملف');
    }
  }

  static async listEmployeeFiles(internalId) {
    try {
      const employee = await this.getEmployeeByInternalId(internalId);
      if (!employee) {
        throw new Error('الموظف غير موجود');
      }
      
      const documentsRef = collection(db, EMPLOYEES_COLLECTION, employee.id, EMPLOYEE_DOCUMENTS_SUBCOLLECTION);
      const querySnapshot = await getDocs(documentsRef);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          uploadedAt: data.uploadedAt?.toDate()
        };
      });
    } catch (error) {
      console.error('Error listing employee files:', error);
      throw new Error('فشل في جلب ملفات الموظف');
    }
  }

  static async deleteEmployeeFile(internalId, fileId) {
    try {
      const employee = await this.getEmployeeByInternalId(internalId);
      if (!employee) {
        throw new Error('الموظف غير موجود');
      }
      
      // Get file metadata
      const fileRef = doc(db, EMPLOYEES_COLLECTION, employee.id, EMPLOYEE_DOCUMENTS_SUBCOLLECTION, fileId);
      const fileSnap = await getDoc(fileRef);
      
      if (!fileSnap.exists()) {
        throw new Error('الملف غير موجود');
      }
      
      const fileData = fileSnap.data();
      
      // Delete from Firebase Storage
      const storageRef = ref(storage, fileData.path);
      await deleteObject(storageRef);
      
      // Delete metadata from Firestore
      await deleteDoc(fileRef);
      
      return true;
    } catch (error) {
      console.error('Error deleting employee file:', error);
      throw new Error('فشل في حذف الملف');
    }
  }

  // Get unique departments for filter dropdown
  static async getDepartments() {
    try {
      const employeesRef = collection(db, EMPLOYEES_COLLECTION);
      const querySnapshot = await getDocs(employeesRef);
      
      const departments = new Set();
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.department) {
          departments.add(data.department);
        }
      });
      
      return Array.from(departments).sort();
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw new Error('فشل في جلب الأقسام');
    }
  }

  // Data validation
  static validateEmployeeData(employeeData) {
    const errors = {};
    
    if (!employeeData.fullName?.trim()) {
      errors.fullName = 'الاسم الكامل مطلوب';
    }
    
    if (employeeData.email && employeeData.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employeeData.email)) {
        errors.email = 'صيغة البريد الإلكتروني غير صحيحة';
      }
    }
    
    if (employeeData.phone && employeeData.phone.trim()) {
      if (!/^[\+\d\-\s\(\)]+$/.test(employeeData.phone)) {
        errors.phone = 'صيغة رقم الهاتف غير صحيحة';
      }
    }
    
    if (employeeData.salary && employeeData.salary !== '') {
      const salary = parseFloat(employeeData.salary);
      if (isNaN(salary) || salary < 0) {
        errors.salary = 'الراتب يجب أن يكون رقماً موجباً';
      }
    }
    
    return errors;
  }

  // Data migration function
  static async migrateExistingData() {
    try {
      console.log('Starting employees migration...');
      const result = await this.getAllEmployees({ limit: 1000 });
      const employees = result.employees;
      let migratedCount = 0;
      
      for (const employee of employees) {
        // Check if internalId is missing or using old format
        if (!employee.internalId || !employee.internalId.startsWith('EMP-')) {
          const newInternalId = generateEmployeeId();
          await this.updateEmployee(employee.id, {
            ...employee,
            internalId: newInternalId
          });
          migratedCount++;
          console.log(`Migrated employee: ${employee.fullName} -> ${newInternalId}`);
        }
      }
      
      console.log(`Migration completed. ${migratedCount} employees migrated.`);
      return { success: true, migratedCount };
    } catch (error) {
      console.error('Error during migration:', error);
      throw new Error('فشل في ترحيل البيانات');
    }
  }
}