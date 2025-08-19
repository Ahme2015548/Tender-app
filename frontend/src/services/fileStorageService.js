import { storage, db, auth } from './firebase.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, setDoc, doc, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import EmployeeAutoCreator from './employeeAutoCreator.js';

class FileStorageService {
  /**
   * Upload a file to Firebase Storage
   * @param {File} file - The file to upload
   * @param {string} folder - The folder path (e.g., 'quotations', 'documents')
   * @returns {Promise<{url: string, path: string}>} - Returns download URL and storage path
   */
  async uploadFile(file, folder = 'uploads') {
    try {
      console.log('🔄 Starting file upload...', { 
        fileName: file.name, 
        fileSize: file.size, 
        folder,
        fileType: file.type
      });

      // Simple authentication check
      if (!auth.currentUser) {
        console.log('❌ No authenticated user found - cannot upload to Storage');
        throw new Error('يجب تسجيل الدخول أولاً لرفع الملفات');
      }
      
      const currentUID = auth.currentUser.uid;
      console.log('✅ Current user:', currentUID);

      if (!file) {
        throw new Error('لم يتم تحديد ملف للرفع');
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت');
      }

      // Create unique filename with timestamp
      const timestamp = Date.now();
      const fileName = `${folder}/${timestamp}_${file.name}`;
      
      console.log('📁 Upload path:', fileName);
      
      // Create storage reference
      const storageRef = ref(storage, fileName);
      console.log('📎 Storage reference created for bucket:', storage.app.options.storageBucket);
      
      // Upload file to secure folder
      console.log('⬆️ Uploading to Firebase Storage folder:', folder);
      const uploadResult = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log('✅ File upload successful:', downloadURL);
      
      return {
        url: downloadURL,
        path: fileName,
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedBy: currentUID,
        uploadedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ File upload error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error object:', error);
      console.error('❌ Auth state during error:', {
        hasUser: !!auth.currentUser,
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email
      });
      
      // Handle specific Firebase errors
      if (error.code === 'storage/unauthorized') {
        throw new Error('غير مخول لرفع الملفات. تحقق من صلاحيات Firebase');
      } else if (error.code === 'storage/canceled') {
        throw new Error('تم إلغاء رفع الملف');
      } else if (error.code === 'storage/unknown') {
        throw new Error('حدث خطأ غير معروف أثناء رفع الملف');
      } else {
        throw new Error(error.message || 'فشل في رفع الملف');
      }
    }
  }

  /**
   * Upload a file to Firebase Storage with custom filename
   * @param {File} file - The file to upload
   * @param {string} folder - The folder path (e.g., 'quotations', 'documents')
   * @param {string} customName - Custom filename to use
   * @returns {Promise<{url: string, path: string}>} - Returns download URL and storage path
   */
  async uploadFileWithCustomName(file, folder = 'uploads', customName) {
    try {
      if (!file) {
        throw new Error('لم يتم تحديد ملف للرفع');
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت');
      }

      // Create filename with timestamp and custom name
      const timestamp = Date.now();
      const fileName = customName ? 
        `${folder}/${timestamp}_${customName}` : 
        `${folder}/${timestamp}_${file.name}`;
      
      // Create storage reference
      const storageRef = ref(storage, fileName);
      
      // Upload file
      const uploadResult = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      return {
        url: downloadURL,
        path: fileName,
        originalName: customName || file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ File upload error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error object:', error);
      console.error('❌ Auth state during error:', {
        hasUser: !!auth.currentUser,
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email
      });
      
      // Handle specific Firebase errors
      if (error.code === 'storage/unauthorized') {
        throw new Error('غير مخول لرفع الملفات. تحقق من صلاحيات Firebase');
      } else if (error.code === 'storage/canceled') {
        throw new Error('تم إلغاء رفع الملف');
      } else if (error.code === 'storage/unknown') {
        throw new Error('حدث خطأ غير معروف أثناء رفع الملف');
      } else {
        throw new Error(error.message || 'فشل في رفع الملف');
      }
    }
  }


  /**
   * Delete a file from Firebase Storage
   * @param {string} filePath - The storage path of the file
   * @returns {Promise<void>}
   */
  async deleteFile(filePath) {
    try {
      if (!filePath) {
        throw new Error('مسار الملف غير محدد');
      }

      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      
      console.log('File deleted successfully:', filePath);
    } catch (error) {
      console.error('File deletion error:', error);
      
      if (error.code === 'storage/object-not-found') {
        console.warn('File not found for deletion:', filePath);
        // Don't throw error for non-existent files
        return;
      }
      
      throw new Error(`فشل في حذف الملف: ${error.message}`);
    }
  }

  /**
   * Get download URL for a file
   * @param {string} filePath - The storage path of the file
   * @returns {Promise<string>} - Download URL
   */
  async getFileURL(filePath) {
    try {
      if (!filePath) {
        throw new Error('مسار الملف غير محدد');
      }

      const fileRef = ref(storage, filePath);
      const downloadURL = await getDownloadURL(fileRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Get file URL error:', error);
      throw new Error(`فشل في الحصول على رابط الملف: ${error.message}`);
    }
  }

  /**
   * Save documents to Firestore subcollection
   * @param {string} tenderId - Tender ID
   * @param {Array} docs - Array of document objects
   */
  async saveDocumentsToFirestore(tenderId, docs) {
    if (!tenderId || !Array.isArray(docs)) return;

    const writeOps = docs.map(docData => {
      const ref = doc(collection(db, `tenders/${tenderId}/tenderDocuments`), docData.id || Date.now().toString());
      return setDoc(ref, docData);
    });

    await Promise.all(writeOps);
  }

  /**
   * Load documents from Firestore subcollection
   * @param {string} tenderId - Tender ID
   * @returns {Array} Array of document objects
   */
  async loadDocumentsFromFirestore(tenderId) {
    try {
      if (!tenderId) return [];
      
      const docsCollection = collection(db, `tenders/${tenderId}/tenderDocuments`);
      const snapshot = await getDocs(docsCollection);
      
      const docs = [];
      snapshot.forEach(doc => {
        docs.push({ ...doc.data(), id: doc.id });
      });
      
      console.log(`Loaded ${docs.length} documents from Firestore for tender: ${tenderId}`);
      return docs;
    } catch (error) {
      console.error('Error loading documents from Firestore:', error);
      return [];
    }
  }

  /**
   * Validate file before upload
   * @param {File} file - File to validate
   * @param {Object} options - Validation options
   * @returns {boolean} - Returns true if valid
   */
  validateFile(file, options = {}) {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    } = options;

    if (!file) {
      throw new Error('لم يتم تحديد ملف');
    }

    if (file.size > maxSize) {
      throw new Error(`حجم الملف كبير جداً. الحد الأقصى ${Math.round(maxSize / (1024 * 1024))} ميجابايت`);
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('نوع الملف غير مدعوم. الأنواع المدعومة: PDF, Word, صور');
    }

    return true;
  }
}

export default new FileStorageService();