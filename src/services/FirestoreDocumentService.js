/**
 * Firestore Document Service - Pure Firebase implementation
 * Manages tender/product documents with Firebase Storage + Firestore metadata
 * All data is tied to authenticated user with ownerId security
 */

import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, auth, storage } from './firebase.js';
import { generateId } from '../utils/idGenerator.js';

export class FirestoreDocumentService {
  static COLLECTION_NAME = 'documents';
  static STORAGE_FOLDER = 'tender-documents';

  /**
   * Get current authenticated user ID
   */
  static getCurrentUserId() {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }
    return auth.currentUser.uid;
  }

  /**
   * Upload document file and create Firestore metadata
   */
  static async uploadDocument(file, metadata = {}) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Uploading document:', file.name);
      
      // Validate file
      if (!file) {
        throw new Error('No file provided');
      }
      
      // Create unique file path
      const fileId = generateId('DOC');
      const fileName = `${fileId}_${file.name}`;
      const storageRef = ref(storage, `${this.STORAGE_FOLDER}/${ownerId}/${fileName}`);
      
      // Upload file to Firebase Storage
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      // Create document metadata in Firestore
      const documentDoc = {
        ownerId,
        internalId: fileId,
        fileName: file.name,
        displayName: metadata.displayName || file.name,
        fileSize: file.size,
        fileType: file.type,
        fileURL: downloadURL,
        storagePath: uploadResult.ref.fullPath,
        tenderId: metadata.tenderId || null,
        productId: metadata.productId || null,
        category: metadata.category || 'general',
        description: metadata.description || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), documentDoc);
      
      console.log('✅ [FIRESTORE] Document uploaded with ID:', docRef.id);
      return {
        id: docRef.id,
        ...documentDoc,
        fileURL: downloadURL
      };
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error uploading document:', error);
      throw new Error('Failed to upload document: ' + error.message);
    }
  }

  /**
   * Get all documents for a specific tender
   */
  static async getTenderDocuments(tenderId) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Fetching documents for tender:', tenderId);
      
      const documentsRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        documentsRef,
        where('ownerId', '==', ownerId),
        where('tenderId', '==', tenderId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
      
      console.log('✅ [FIRESTORE] Loaded tender documents:', documents.length);
      return documents;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error fetching tender documents:', error);
      throw new Error('Failed to fetch tender documents: ' + error.message);
    }
  }

  /**
   * Get all documents for a specific product
   */
  static async getProductDocuments(productId) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Fetching documents for product:', productId);
      
      const documentsRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        documentsRef,
        where('ownerId', '==', ownerId),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
      
      console.log('✅ [FIRESTORE] Loaded product documents:', documents.length);
      return documents;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error fetching product documents:', error);
      throw new Error('Failed to fetch product documents: ' + error.message);
    }
  }

  /**
   * Get all documents for current user
   */
  static async getAllUserDocuments() {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Fetching all user documents');
      
      const documentsRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        documentsRef,
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
      
      console.log('✅ [FIRESTORE] Loaded all user documents:', documents.length);
      return documents;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error fetching user documents:', error);
      throw new Error('Failed to fetch user documents: ' + error.message);
    }
  }

  /**
   * Update document metadata
   */
  static async updateDocument(documentId, updateData) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Updating document:', documentId);
      
      const docRef = doc(db, this.COLLECTION_NAME, documentId);
      
      // First verify the document belongs to the current user
      const docDoc = await getDoc(docRef);
      if (!docDoc.exists() || docDoc.data().ownerId !== ownerId) {
        throw new Error('Document not found or access denied');
      }
      
      const updateDoc = {
        ...updateData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updateDoc);
      
      console.log('✅ [FIRESTORE] Document updated:', documentId);
      return documentId;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error updating document:', error);
      throw new Error('Failed to update document: ' + error.message);
    }
  }

  /**
   * Delete document (both Firestore metadata and Storage file)
   */
  static async deleteDocument(documentId) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Deleting document:', documentId);
      
      const docRef = doc(db, this.COLLECTION_NAME, documentId);
      
      // First get the document to check ownership and get storage path
      const docDoc = await getDoc(docRef);
      if (!docDoc.exists() || docDoc.data().ownerId !== ownerId) {
        throw new Error('Document not found or access denied');
      }
      
      const docData = docDoc.data();
      
      // Delete from Firebase Storage if storage path exists
      if (docData.storagePath) {
        try {
          const storageRef = ref(storage, docData.storagePath);
          await deleteObject(storageRef);
          console.log('✅ [FIRESTORE] Storage file deleted');
        } catch (storageError) {
          console.warn('⚠️ [FIRESTORE] Storage file deletion failed (may not exist):', storageError);
        }
      }
      
      // Delete from Firestore
      await deleteDoc(docRef);
      
      console.log('✅ [FIRESTORE] Document deleted:', documentId);
      return true;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error deleting document:', error);
      throw new Error('Failed to delete document: ' + error.message);
    }
  }

  /**
   * Get a specific document by ID
   */
  static async getDocumentById(documentId) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Fetching document by ID:', documentId);
      
      const docRef = doc(db, this.COLLECTION_NAME, documentId);
      const docDoc = await getDoc(docRef);
      
      if (!docDoc.exists() || docDoc.data().ownerId !== ownerId) {
        return null;
      }
      
      const data = docDoc.data();
      return {
        id: docDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      };
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error fetching document:', error);
      throw new Error('Failed to fetch document: ' + error.message);
    }
  }

  /**
   * Search documents by filename or display name
   */
  static async searchDocuments(searchTerm) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Searching documents for:', searchTerm);
      
      // Get all user documents and filter client-side for now
      // In production, you might want to use Firebase's text search or Algolia
      const allDocuments = await this.getAllUserDocuments();
      
      const searchLower = searchTerm.toLowerCase();
      const filteredDocuments = allDocuments.filter(doc => 
        doc.fileName?.toLowerCase().includes(searchLower) ||
        doc.displayName?.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower)
      );
      
      console.log('✅ [FIRESTORE] Search results:', filteredDocuments.length);
      return filteredDocuments;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error searching documents:', error);
      throw new Error('Failed to search documents: ' + error.message);
    }
  }

  /**
   * Get documents by category
   */
  static async getDocumentsByCategory(category) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Fetching documents by category:', category);
      
      const documentsRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        documentsRef,
        where('ownerId', '==', ownerId),
        where('category', '==', category),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
      
      console.log('✅ [FIRESTORE] Loaded documents by category:', documents.length);
      return documents;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error fetching documents by category:', error);
      throw new Error('Failed to fetch documents by category: ' + error.message);
    }
  }
}

export default FirestoreDocumentService;