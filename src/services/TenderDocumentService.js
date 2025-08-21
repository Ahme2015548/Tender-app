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
import { db, storage } from './firebase';
import fileStorageService from './fileStorageService';

/**
 * Robust Document Management Service
 * Based on Firebase best practices with transactions and real-time updates
 */
export class TenderDocumentService {
  static collectionName = 'tender_documents';
  static storagePath = 'tender-documents';

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
   * Upload document using robust Firebase approach
   */
  static async uploadDocument(file, { tenderId, tenderTitle = '', tenderReferenceNumber = '', customFileName, userId = 'system' } = {}) {
    console.log('📤 Starting robust document upload:', file.name);
    
    try {
      // Step 1: Create Firestore document shell first
      const docRef = await addDoc(collection(db, this.collectionName), {
        fileName: customFileName || file.name,
        originalFileName: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
        status: 'uploading',
        isTrashed: false,
        tenderId: tenderId || 'new',
        tenderTitle,
        tenderReferenceNumber,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        trashedAt: null,
        trashedBy: null,
        uploadedBy: userId,
        url: null,
        storagePath: null
      });

      console.log('✅ Document shell created:', docRef.id);

      // Step 2: Upload to Firebase Storage using existing service
      const fileData = await fileStorageService.uploadFile(file, 'tender-documents');
      
      console.log('✅ File uploaded to storage:', fileData.path);

      // Step 3: Update document with file data
      await updateDoc(doc(db, this.collectionName, docRef.id), {
        url: fileData.url,
        storagePath: fileData.path,
        status: 'ready',
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Document upload completed:', docRef.id);
      
      return {
        id: docRef.id,
        fileName: customFileName || file.name,
        originalFileName: file.name,
        url: fileData.url,
        storagePath: fileData.path,
        size: file.size,
        contentType: file.type || 'application/octet-stream'
      };

    } catch (error) {
      console.error('❌ Document upload failed:', error);
      throw new Error(`فشل في رفع الوثيقة: ${error.message}`);
    }
  }

  /**
   * Move document to trash (soft delete) - Transactional and idempotent
   */
  static async moveDocumentToTrash(documentId, { userId = 'system' } = {}) {
    console.log('🗑️ Moving document to trash:', documentId);
    
    await this.withRetry(async () => {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, this.collectionName, documentId);
        const snap = await tx.get(ref);
        
        if (!snap.exists()) {
          throw new Error('الوثيقة غير موجودة');
        }
        
        const data = snap.data();
        if (data.isTrashed === true) {
          console.log('Document already trashed - idempotent operation');
          return;
        }
        
        tx.update(ref, {
          isTrashed: true,
          trashedAt: serverTimestamp(),
          trashedBy: userId,
          updatedAt: serverTimestamp(),
        });
      });
    });
    
    console.log('✅ Document moved to trash successfully');
  }

  /**
   * Restore document from trash - Transactional and idempotent
   */
  static async restoreDocumentFromTrash(documentId) {
    console.log('♻️ Restoring document from trash:', documentId);
    
    await this.withRetry(async () => {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, this.collectionName, documentId);
        const snap = await tx.get(ref);
        
        if (!snap.exists()) {
          throw new Error('الوثيقة غير موجودة');
        }
        
        const data = snap.data();
        if (data.isTrashed === false) {
          console.log('Document already active - idempotent operation');
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
    
    console.log('✅ Document restored from trash successfully');
  }

  /**
   * Get active documents for a tender with real-time updates
   */
  static subscribeToTenderDocuments(tenderId, callback) {
    console.log('📡 Setting up Firebase subscription for tenderId:', tenderId);
    
    // Temporary solution: Use simpler query without orderBy to avoid index requirement
    const q = query(
      collection(db, this.collectionName),
      where('tenderId', '==', tenderId),
      where('isTrashed', '==', false)
    );
    
    console.log('📡 Firebase query created (no orderBy - temporary):', {
      collection: this.collectionName,
      tenderId: tenderId,
      filters: ['tenderId ==', tenderId, 'isTrashed ==', false]
    });
    
    return onSnapshot(q, (snapshot) => {
      console.log('📡 Firebase snapshot received:');
      console.log('- Snapshot size:', snapshot.size);
      console.log('- Snapshot empty:', snapshot.empty);
      
      const documents = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('- Document found:', {
          id: doc.id,
          fileName: data.fileName,
          tenderId: data.tenderId,
          isTrashed: data.isTrashed,
          status: data.status
        });
        documents.push({ id: doc.id, ...data });
      });
      
      // Sort manually by updatedAt since we can't use orderBy without index
      documents.sort((a, b) => {
        const dateA = a.updatedAt?.seconds || 0;
        const dateB = b.updatedAt?.seconds || 0;
        return dateB - dateA; // Descending order (newest first)
      });
      
      console.log('📡 Calling callback with', documents.length, 'documents (sorted manually)');
      callback(documents);
    }, (error) => {
      console.error('❌ Document subscription error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        tenderId: tenderId,
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
      where('isTrashed', '==', true),
      orderBy('updatedAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const documents = [];
      snapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      callback(documents);
    }, (error) => {
      console.error('Trashed documents subscription error:', error);
      callback([]);
    });
  }

  /**
   * Get all active documents (non-real-time for one-time queries)
   */
  static async getTenderDocuments(tenderId) {
    try {
      // Temporary solution: Use simpler query without orderBy
      const q = query(
        collection(db, this.collectionName),
        where('tenderId', '==', tenderId),
        where('isTrashed', '==', false)
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
      console.error('Error getting tender documents:', error);
      throw new Error(`فشل في تحميل الوثائق: ${error.message}`);
    }
  }

  /**
   * Get all trashed documents (non-real-time for one-time queries)
   */
  static async getTrashedDocuments() {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('isTrashed', '==', true),
        orderBy('updatedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const documents = [];
      
      snapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      
      return documents;
    } catch (error) {
      console.error('Error getting trashed documents:', error);
      throw new Error(`فشل في تحميل المهملات: ${error.message}`);
    }
  }

  /**
   * Permanently delete documents (both Firestore and Storage)
   */
  static async permanentlyDeleteDocuments(documentIds = []) {
    if (!documentIds.length) return;
    
    console.log('🔥 Permanently deleting documents:', documentIds);
    
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
    
    console.log('✅ Documents permanently deleted');
  }

  /**
   * Legacy method for backward compatibility
   */
  static async deleteDocument(documentId) {
    return await this.moveDocumentToTrash(documentId);
  }
}

export default TenderDocumentService;