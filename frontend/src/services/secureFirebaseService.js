import { auth } from './firebase.js';
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase.js';

/**
 * Secure Firebase Service
 * Ensures all Firebase operations comply with security rules
 * Requires active employee authentication for all operations
 */
class SecureFirebaseService {
  
  /**
   * Validate that user is authenticated and get current UID
   */
  static getCurrentUserUID() {
    if (!auth.currentUser) {
      throw new Error('يجب تسجيل الدخول للوصول إلى البيانات');
    }
    return auth.currentUser.uid;
  }

  /**
   * Validate active employee status before operations
   */
  static async validateActiveEmployee() {
    const uid = this.getCurrentUserUID();
    
    try {
      const employeeDoc = await getDoc(doc(db, 'employees', uid));
      
      if (!employeeDoc.exists()) {
        throw new Error('لا يوجد سجل موظف لهذا المستخدم');
      }
      
      const employeeData = employeeDoc.data();
      if (employeeData.status !== 'active') {
        throw new Error('حساب الموظف غير مفعل');
      }
      
      return { uid, employeeData };
    } catch (error) {
      throw new Error(`فشل التحقق من صلاحيات الموظف: ${error.message}`);
    }
  }

  /**
   * Secure collection reference
   */
  static async secureCollection(collectionName) {
    await this.validateActiveEmployee();
    return collection(db, collectionName);
  }

  /**
   * Secure document reference
   */
  static async secureDoc(collectionName, documentId) {
    await this.validateActiveEmployee();
    return doc(db, collectionName, documentId);
  }

  /**
   * Secure document creation
   */
  static async secureAddDoc(collectionName, data, options = {}) {
    const { uid } = await this.validateActiveEmployee();
    
    // Add creator information
    const docData = {
      ...data,
      createdBy: uid,
      createdAt: new Date().toISOString(),
      updatedBy: uid,
      updatedAt: new Date().toISOString(),
      ...options.additionalFields
    };
    
    const collectionRef = collection(db, collectionName);
    return await addDoc(collectionRef, docData);
  }

  /**
   * Secure document creation with specific ID
   */
  static async secureSetDoc(collectionName, documentId, data, options = {}) {
    const { uid } = await this.validateActiveEmployee();
    
    // Add creator information
    const docData = {
      ...data,
      createdBy: uid,
      createdAt: new Date().toISOString(),
      updatedBy: uid,
      updatedAt: new Date().toISOString(),
      ...options.additionalFields
    };
    
    const docRef = doc(db, collectionName, documentId);
    return await setDoc(docRef, docData, options.merge ? { merge: true } : {});
  }

  /**
   * Secure document read
   */
  static async secureGetDoc(collectionName, documentId) {
    await this.validateActiveEmployee();
    const docRef = doc(db, collectionName, documentId);
    return await getDoc(docRef);
  }

  /**
   * Secure collection read
   */
  static async secureGetDocs(collectionName, queryConstraints = []) {
    await this.validateActiveEmployee();
    const collectionRef = collection(db, collectionName);
    
    let q = collectionRef;
    if (queryConstraints.length > 0) {
      q = query(collectionRef, ...queryConstraints);
    }
    
    return await getDocs(q);
  }

  /**
   * Secure document update
   */
  static async secureUpdateDoc(collectionName, documentId, data, options = {}) {
    const { uid } = await this.validateActiveEmployee();
    
    // Add update information
    const updateData = {
      ...data,
      updatedBy: uid,
      updatedAt: new Date().toISOString(),
      ...options.additionalFields
    };
    
    const docRef = doc(db, collectionName, documentId);
    return await updateDoc(docRef, updateData);
  }

  /**
   * Secure document deletion (soft delete by default)
   */
  static async secureDeleteDoc(collectionName, documentId, options = {}) {
    const { uid } = await this.validateActiveEmployee();
    
    if (options.hardDelete) {
      // Hard delete - actually remove document
      const docRef = doc(db, collectionName, documentId);
      return await deleteDoc(docRef);
    } else {
      // Soft delete - mark as deleted
      return await this.secureUpdateDoc(collectionName, documentId, {
        isDeleted: true,
        deletedBy: uid,
        deletedAt: new Date().toISOString()
      });
    }
  }

  /**
   * Secure real-time listener
   */
  static async secureOnSnapshot(collectionName, callback, queryConstraints = []) {
    await this.validateActiveEmployee();
    const collectionRef = collection(db, collectionName);
    
    let q = collectionRef;
    if (queryConstraints.length > 0) {
      q = query(collectionRef, ...queryConstraints);
    }
    
    return onSnapshot(q, callback);
  }

  /**
   * Secure batch operations
   */
  static async secureBatchWrite(operations) {
    const { uid } = await this.validateActiveEmployee();
    const batch = writeBatch(db);
    
    operations.forEach(op => {
      const docRef = doc(db, op.collection, op.id);
      
      if (op.type === 'set') {
        const data = {
          ...op.data,
          createdBy: uid,
          createdAt: new Date().toISOString(),
          updatedBy: uid,
          updatedAt: new Date().toISOString()
        };
        batch.set(docRef, data);
      } else if (op.type === 'update') {
        const data = {
          ...op.data,
          updatedBy: uid,
          updatedAt: new Date().toISOString()
        };
        batch.update(docRef, data);
      } else if (op.type === 'delete') {
        batch.delete(docRef);
      }
    });
    
    return await batch.commit();
  }

  /**
   * Secure transaction
   */
  static async secureTransaction(updateFunction) {
    const { uid } = await this.validateActiveEmployee();
    
    return await runTransaction(db, (transaction) => {
      return updateFunction(transaction, uid);
    });
  }

  /**
   * Employee-specific operations (for employee collection)
   */
  static async createEmployeeDoc(employeeData, targetUID = null) {
    const currentUID = this.getCurrentUserUID();
    const targetUserID = targetUID || currentUID;
    
    // For creating other employee records, validate current user is active employee
    if (targetUID && targetUID !== currentUID) {
      await this.validateActiveEmployee();
    }
    
    const docData = {
      ...employeeData,
      createdBy: currentUID,
      createdAt: new Date().toISOString(),
      updatedBy: currentUID,
      updatedAt: new Date().toISOString()
    };
    
    const docRef = doc(db, 'employees', targetUserID);
    return await setDoc(docRef, docData);
  }

  /**
   * Update own employee record (for login tracking, etc.)
   */
  static async updateOwnEmployeeDoc(data) {
    const uid = this.getCurrentUserUID();
    
    const updateData = {
      ...data,
      updatedBy: uid,
      updatedAt: new Date().toISOString()
    };
    
    const docRef = doc(db, 'employees', uid);
    return await updateDoc(docRef, updateData);
  }

  /**
   * Get own employee record
   */
  static async getOwnEmployeeDoc() {
    const uid = this.getCurrentUserUID();
    const docRef = doc(db, 'employees', uid);
    return await getDoc(docRef);
  }
}

export default SecureFirebaseService;