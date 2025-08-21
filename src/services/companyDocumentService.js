import { 
  collection, 
  doc, 
  addDoc, 
  runTransaction, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDoc, 
  writeBatch, 
  updateDoc,
  getDocs
} from "firebase/firestore";
import { 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";
import { db, storage, auth } from './firebase.js';
import fileStorageService from './fileStorageService';

/**
 * Company Document Management Service
 * Independent from TenderDocumentService for company-specific documents
 */
export class CompanyDocumentService {
  static collectionName = 'companydocuments';
  static storagePath = 'company-documents';

  /**
   * Utility: Retry with exponential backoff for Firebase transaction conflicts
   */
  static async withRetry(fn, { retries = 5, base = 150 } = {}) {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        if (attempt > retries) throw err;
        const ms = Math.floor(base * Math.pow(2, attempt - 1) + Math.random() * base);
        await new Promise((res) => setTimeout(res, ms));
      }
    }
  }

  /**
   * Upload document using simple Firebase approach
   */
  static async uploadDocument(file, { companyId, companyName = '', companyEmail = '', customFileName, expiryDate, userId } = {}) {
    console.log('📤 Starting company document upload:', file.name);
    
    try {
      // Simple authentication check
      if (!auth.currentUser) {
        throw new Error('يجب تسجيل الدخول لرفع الوثائق');
      }
      
      const currentUserId = userId || auth.currentUser.uid;
      
      // Create Firestore document shell first
      const docRef = await addDoc(collection(db, this.collectionName), {
        fileName: customFileName || file.name,
        originalFileName: file.name,
        size: file.size,
        fileSize: file.size, // For modal compatibility
        contentType: file.type || 'application/octet-stream',
        fileType: file.type || 'application/octet-stream', // For modal compatibility
        status: 'uploading',
        isTrashed: false,
        companyId: companyId || 'new',
        companyName,
        companyEmail,
        expiryDate: expiryDate || null, // Save expiry date to Firebase
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        trashedAt: null,
        trashedBy: null,
        uploadedBy: currentUserId,
        url: null,
        fileURL: null, // For modal compatibility
        storagePath: null
      });

      console.log('✅ Company document shell created:', docRef.id);

      // Step 2: Upload to Firebase Storage using existing service
      console.log('🔄 About to call fileStorageService.uploadFile with:', {
        fileName: file.name,
        fileSize: file.size,
        folder: 'company-documents'
      });
      
      const fileData = await fileStorageService.uploadFile(file, 'company-documents');
      
      console.log('✅ File uploaded to storage:', fileData.path);

      // Step 3: Update document with file data
      await updateDoc(doc(db, this.collectionName, docRef.id), {
        url: fileData.url,
        fileURL: fileData.url, // For modal compatibility
        storagePath: fileData.path,
        status: 'ready',
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Company document upload completed:', docRef.id);
      
      return {
        id: docRef.id,
        fileName: customFileName || file.name,
        originalFileName: file.name,
        url: fileData.url,
        fileURL: fileData.url, // Add this for modal compatibility
        storagePath: fileData.path,
        size: file.size,
        fileSize: file.size, // Add this for modal compatibility
        contentType: file.type || 'application/octet-stream',
        fileType: file.type || 'application/octet-stream' // Add this for modal compatibility
      };

    } catch (error) {
      console.error('❌ Company document upload failed:', error);
      throw new Error(`فشل في رفع وثيقة الشركة: ${error.message}`);
    }
  }

  /**
   * Move document to trash (soft delete) - Transactional and idempotent
   */
  static async moveDocumentToTrash(documentId, { userId } = {}) {
    // Get current authenticated user ID
    const currentUserId = userId || auth.currentUser?.uid || 'system';
    
    console.log('🗑️ Moving company document to trash:', {
      documentId,
      userId: currentUserId,
      collection: this.collectionName
    });
    
    try {
      await this.withRetry(async () => {
        await runTransaction(db, async (tx) => {
          const ref = doc(db, this.collectionName, documentId);
          const snap = await tx.get(ref);
          
          console.log('📄 Document lookup result:', {
            documentId,
            exists: snap.exists(),
            collection: this.collectionName
          });
          
          if (!snap.exists()) {
            // More detailed error for debugging
            console.error('❌ Document not found in Firebase:', {
              documentId,
              collection: this.collectionName,
              attemptedPath: `${this.collectionName}/${documentId}`
            });
            throw new Error(`وثيقة الشركة غير موجودة في قاعدة البيانات (ID: ${documentId})`);
          }
          
          const data = snap.data();
          console.log('📊 Document data:', {
            fileName: data.fileName,
            isTrashed: data.isTrashed,
            status: data.status
          });
          
          if (data.isTrashed === true) {
            console.log('Company document already trashed - idempotent operation');
            return;
          }
          
          tx.update(ref, {
            isTrashed: true,
            trashedAt: serverTimestamp(),
            trashedBy: currentUserId,
            updatedAt: serverTimestamp(),
          });
        });
      });
      
      console.log('✅ Company document moved to trash successfully');
    } catch (error) {
      console.error('❌ Error moving company document to trash:', {
        documentId,
        error: error.message,
        stack: error.stack
      });
      
      // Re-throw with more context
      if (error.message.includes('وثيقة الشركة غير موجودة')) {
        throw error; // Keep original detailed message
      } else {
        throw new Error(`فشل في نقل وثيقة الشركة للمهملات: ${error.message}`);
      }
    }
  }

  /**
   * Restore document from trash - Transactional and idempotent
   */
  static async restoreDocumentFromTrash(documentId) {
    console.log('♻️ Restoring company document from trash:', documentId);
    
    await this.withRetry(async () => {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, this.collectionName, documentId);
        const snap = await tx.get(ref);
        
        if (!snap.exists()) {
          throw new Error('وثيقة الشركة غير موجودة');
        }
        
        const data = snap.data();
        if (data.isTrashed === false) {
          console.log('Company document already active - idempotent operation');
          return;
        }
        
        tx.update(ref, {
          isTrashed: false,
          trashedAt: null,
          trashedBy: null,
          updatedAt: serverTimestamp(),
        });
      });
    });
    
    console.log('✅ Company document restored from trash successfully');
  }

  /**
   * Get active documents for a company with real-time updates
   */
  static subscribeToCompanyDocuments(companyId, callback) {
    console.log('📡 Setting up Firebase subscription for companyId:', companyId);
    
    const q = query(
      collection(db, this.collectionName),
      where('companyId', '==', companyId),
      where('isTrashed', '==', false)
    );
    
    console.log('📡 Firebase query created for company documents:', {
      collection: this.collectionName,
      companyId: companyId,
      filters: ['companyId ==', companyId, 'isTrashed ==', false]
    });
    
    return onSnapshot(q, (snapshot) => {
      console.log('📡 Firebase snapshot received for company documents:');
      console.log('- Snapshot size:', snapshot.size);
      console.log('- Snapshot empty:', snapshot.empty);
      
      const documents = [];
      snapshot.forEach((doc) => {
        const rawData = doc.data();
        const data = { 
          id: doc.id, 
          ...rawData,
          // Ensure consistent property names for modal compatibility
          fileURL: rawData.fileURL || rawData.url,
          fileType: rawData.fileType || rawData.contentType,
          fileSize: rawData.fileSize || rawData.size
        };
        console.log('- Company document found:', {
          id: doc.id,
          fileName: data.fileName,
          companyId: data.companyId,
          isTrashed: data.isTrashed,
          status: data.status,
          hasURL: !!data.fileURL,
          hasExpiryDate: !!data.expiryDate
        });
        documents.push(data);
      });
      
      // Sort manually by updatedAt since we can't use orderBy without index
      documents.sort((a, b) => {
        const dateA = a.updatedAt?.seconds || 0;
        const dateB = b.updatedAt?.seconds || 0;
        return dateB - dateA; // Descending order (newest first)
      });
      
      console.log('📡 Calling callback with', documents.length, 'company documents (sorted manually)');
      callback(documents);
    }, (error) => {
      console.error('❌ Company document subscription error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        companyId: companyId,
        collection: this.collectionName
      });
      callback([]);
    });
  }

  /**
   * Get trashed documents with real-time updates
   */
  static subscribeToTrashedDocuments(callback) {
    const q = query(
      collection(db, this.collectionName),
      where('isTrashed', '==', true)
    );
    
    return onSnapshot(q, (snapshot) => {
      const documents = [];
      snapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort manually by updatedAt
      documents.sort((a, b) => {
        const dateA = a.updatedAt?.seconds || 0;
        const dateB = b.updatedAt?.seconds || 0;
        return dateB - dateA;
      });
      
      callback(documents);
    }, (error) => {
      console.error('Company trashed documents subscription error:', error);
      callback([]);
    });
  }

  /**
   * Get all active documents (non-real-time for one-time queries)
   * For new companies (companyId = 'new'), also check for temp documents
   */
  static async getCompanyDocuments(companyId) {
    try {
      console.log('🔍 Getting company documents for ID:', companyId);
      
      const q = query(
        collection(db, this.collectionName),
        where('companyId', '==', companyId),
        where('isTrashed', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const documents = [];
      
      snapshot.forEach((doc) => {
        const rawData = doc.data();
        const docData = { 
          id: doc.id, 
          ...rawData,
          // Ensure consistent property names for modal compatibility
          fileURL: rawData.fileURL || rawData.url,
          fileType: rawData.fileType || rawData.contentType,
          fileSize: rawData.fileSize || rawData.size
        };
        console.log('📄 Found document:', docData.fileName, 'for company:', docData.companyId);
        documents.push(docData);
      });
      
      console.log(`📊 Total documents found for company ${companyId}: ${documents.length}`);
      
      // Sort manually by updatedAt
      documents.sort((a, b) => {
        const dateA = a.updatedAt?.seconds || 0;
        const dateB = b.updatedAt?.seconds || 0;
        return dateB - dateA;
      });
      
      return documents;
    } catch (error) {
      console.error('Error getting company documents:', error);
      throw new Error(`فشل في تحميل وثائق الشركة: ${error.message}`);
    }
  }

  /**
   * Get ALL documents (for debugging purposes)
   */
  static async getAllDocuments() {
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      const documents = [];
      
      snapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort manually by updatedAt
      documents.sort((a, b) => {
        const dateA = a.updatedAt?.seconds || 0;
        const dateB = b.updatedAt?.seconds || 0;
        return dateB - dateA;
      });
      
      return documents;
    } catch (error) {
      console.error('Error getting all company documents:', error);
      throw new Error(`فشل في تحميل جميع وثائق الشركات: ${error.message}`);
    }
  }

  /**
   * Get all trashed documents (non-real-time for one-time queries)
   */
  static async getTrashedDocuments() {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('isTrashed', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const documents = [];
      
      snapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort manually by updatedAt
      documents.sort((a, b) => {
        const dateA = a.updatedAt?.seconds || 0;
        const dateB = b.updatedAt?.seconds || 0;
        return dateB - dateA;
      });
      
      return documents;
    } catch (error) {
      console.error('Error getting trashed company documents:', error);
      throw new Error(`فشل في تحميل مهملات وثائق الشركة: ${error.message}`);
    }
  }

  /**
   * Permanently delete documents (both Firestore and Storage)
   */
  static async permanentlyDeleteDocuments(documentIds = []) {
    if (!documentIds.length) return;
    
    console.log('🔥 Permanently deleting company documents:', documentIds);
    
    // Step 1: Get document data for storage cleanup
    const batch = writeBatch(db);
    const refs = documentIds.map((id) => doc(db, this.collectionName, id));
    const snaps = await Promise.all(refs.map((r) => getDoc(r)));

    const storageDeletePromises = [];
    
    snaps.forEach((snap) => {
      if (!snap.exists()) return;
      
      const data = snap.data();
      // Only delete if actually trashed (safety check)
      if (data.isTrashed !== true) return;
      
      // Schedule Firestore delete
      batch.delete(doc(db, this.collectionName, snap.id));
      
      // Schedule Storage delete (best effort)
      if (data.storagePath) {
        const sref = storageRef(storage, data.storagePath);
        storageDeletePromises.push(
          deleteObject(sref).catch((error) => {
            console.warn('Storage delete failed (continuing):', error);
          })
        );
      }
    });

    // Execute all deletes
    await batch.commit();
    await Promise.allSettled(storageDeletePromises);
    
    console.log('✅ Company documents permanently deleted');
  }

  /**
   * Update company ID for documents that were uploaded before company was saved
   * This fixes the issue where documents are uploaded with companyId: 'new' 
   * but need to be linked to the actual company ID after creation
   */
  static async updateDocumentCompanyId(oldCompanyId, newCompanyId, companyData = {}) {
    console.log('🔄 Updating company documents from temp ID to real ID:', {
      oldCompanyId,
      newCompanyId,
      companyName: companyData.name
    });
    
    try {
      // Find all documents with the old company ID
      const q = query(
        collection(db, this.collectionName),
        where('companyId', '==', oldCompanyId),
        where('isTrashed', '==', false)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No documents found with old company ID:', oldCompanyId);
        return 0;
      }
      
      console.log(`Found ${snapshot.size} documents to update company ID`);
      
      // Update each document with the new company ID and data
      const updatePromises = [];
      snapshot.forEach((docSnap) => {
        const updateData = {
          companyId: newCompanyId,
          companyName: companyData.name || '',
          companyEmail: companyData.email || '',
          updatedAt: serverTimestamp()
        };
        
        updatePromises.push(
          updateDoc(doc(db, this.collectionName, docSnap.id), updateData)
        );
      });
      
      await Promise.all(updatePromises);
      
      console.log(`✅ Updated ${snapshot.size} documents with new company ID:`, newCompanyId);
      return snapshot.size;
      
    } catch (error) {
      console.error('❌ Error updating document company IDs:', error);
      throw new Error(`فشل في ربط الوثائق بالشركة: ${error.message}`);
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  static async deleteDocument(documentId) {
    return await this.moveDocumentToTrash(documentId);
  }
}

export default CompanyDocumentService;