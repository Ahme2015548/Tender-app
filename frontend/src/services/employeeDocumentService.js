import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase.js';
import fileStorageService from './fileStorageService.js';

/**
 * Employee Document Service
 * Handles document management for employees with Firebase integration
 * Pattern matches TenderDocumentService for consistency
 */
class EmployeeDocumentService {
  static COLLECTION_NAME = 'employee_documents';
  
  /**
   * Upload document for employee
   */
  static async uploadDocument(file, employeeId, customFileName) {
    try {
      console.log('📤 Uploading employee document:', file.name, 'for employee:', employeeId);
      
      // Validate file first
      fileStorageService.validateFile(file, {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      });

      // Upload to Firebase Storage
      const fileData = await fileStorageService.uploadFile(file, 'employee-documents');
      
      // Create document metadata
      const documentData = {
        fileName: customFileName.trim(),
        originalFileName: file.name,
        fileURL: fileData.url,
        storagePath: fileData.path,
        fileSize: file.size,
        fileType: file.type,
        employeeId: employeeId || 'new',
        uploadedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), documentData);
      
      console.log('✅ Employee document uploaded successfully:', docRef.id);
      
      return {
        id: docRef.id,
        ...documentData,
        uploadedAt: new Date().toISOString(), // For immediate use
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error uploading employee document:', error);
      throw new Error(`فشل في رفع الوثيقة: ${error.message}`);
    }
  }

  /**
   * Get all documents for specific employee
   */
  static async getEmployeeDocuments(employeeId) {
    try {
      console.log('📋 Loading documents for employee:', employeeId);
      
      if (!employeeId || employeeId === 'new') {
        console.log('⚠️ No employee ID provided, returning empty array');
        return [];
      }

      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('employeeId', '==', employeeId),
        orderBy('uploadedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const documents = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        documents.push({
          id: doc.id,
          ...data,
          uploadedAt: data.uploadedAt?.toDate?.() || new Date(),
          createdAt: data.createdAt?.toDate?.() || new Date()
        });
      });

      console.log('✅ Loaded employee documents:', documents.length);
      return documents;
    } catch (error) {
      console.error('❌ Error loading employee documents:', error);
      throw new Error(`فشل في تحميل الوثائق: ${error.message}`);
    }
  }

  /**
   * Delete employee document
   */
  static async deleteDocument(documentId) {
    try {
      console.log('🗑️ Deleting employee document:', documentId);
      
      // Get document data first
      const docRef = doc(db, this.COLLECTION_NAME, documentId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('الوثيقة غير موجودة');
      }
      
      const documentData = docSnap.data();
      
      // Delete from Firebase Storage
      if (documentData.storagePath) {
        try {
          await fileStorageService.deleteFile(documentData.storagePath);
          console.log('✅ File deleted from storage:', documentData.storagePath);
        } catch (storageError) {
          console.warn('⚠️ Error deleting from storage (non-critical):', storageError.message);
        }
      }
      
      // Delete from Firestore
      await deleteDoc(docRef);
      
      console.log('✅ Employee document deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting employee document:', error);
      throw new Error(`فشل في حذف الوثيقة: ${error.message}`);
    }
  }

  /**
   * Update employee document metadata
   */
  static async updateDocument(documentId, updateData) {
    try {
      console.log('📝 Updating employee document:', documentId);
      
      const docRef = doc(db, this.COLLECTION_NAME, documentId);
      const dataToUpdate = {
        ...updateData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, dataToUpdate);
      
      console.log('✅ Employee document updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating employee document:', error);
      throw new Error(`فشل في تحديث الوثيقة: ${error.message}`);
    }
  }

  /**
   * Transfer documents from 'new' employee to actual employee ID
   */
  static async transferDocuments(fromEmployeeId, toEmployeeId) {
    try {
      console.log('🔄 Transferring documents from:', fromEmployeeId, 'to:', toEmployeeId);
      
      const documents = await this.getEmployeeDocuments(fromEmployeeId);
      
      if (documents.length === 0) {
        console.log('⚠️ No documents to transfer');
        return [];
      }

      // Update all documents with new employee ID
      const updatePromises = documents.map(document => 
        this.updateDocument(document.id, { employeeId: toEmployeeId })
      );

      await Promise.all(updatePromises);
      
      console.log('✅ Documents transferred successfully:', documents.length);
      return documents;
    } catch (error) {
      console.error('❌ Error transferring documents:', error);
      throw new Error(`فشل في نقل الوثائق: ${error.message}`);
    }
  }

  /**
   * Get all documents across all employees (for admin use)
   */
  static async getAllDocuments() {
    try {
      console.log('📋 Loading all employee documents');
      
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('uploadedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const documents = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        documents.push({
          id: doc.id,
          ...data,
          uploadedAt: data.uploadedAt?.toDate?.() || new Date(),
          createdAt: data.createdAt?.toDate?.() || new Date()
        });
      });

      console.log('✅ Loaded all employee documents:', documents.length);
      return documents;
    } catch (error) {
      console.error('❌ Error loading all employee documents:', error);
      throw new Error(`فشل في تحميل جميع الوثائق: ${error.message}`);
    }
  }

  /**
   * Validate document data
   */
  static validateDocumentData(documentData) {
    const errors = {};

    if (!documentData.fileName || !documentData.fileName.trim()) {
      errors.fileName = 'اسم الملف مطلوب';
    }

    if (!documentData.fileURL) {
      errors.fileURL = 'رابط الملف مطلوب';
    }

    if (!documentData.employeeId) {
      errors.employeeId = 'معرف الموظف مطلوب';
    }

    return errors;
  }
}

export { EmployeeDocumentService };