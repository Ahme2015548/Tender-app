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
  limit,
  serverTimestamp,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db, auth } from './firebase.js';

/**
 * Reusable Firestore service layer with optimistic updates and rollback on error
 * Makes Firestore the single source of truth with optional read-only caching
 */
export class FirebaseService {
  
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collectionRef = collection(db, collectionName);
  }

  /**
   * Get current authenticated user ID for ownership filtering
   */
  getCurrentUserId() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.uid;
  }

  /**
   * Add ownership and versioning fields to document data
   */
  addOwnershipFields(data, isUpdate = false) {
    const userId = this.getCurrentUserId();
    const baseFields = {
      ownerId: userId,
      updatedAt: serverTimestamp(),
      version: isUpdate ? increment(1) : 1
    };

    if (!isUpdate) {
      baseFields.createdAt = serverTimestamp();
    }

    return { ...data, ...baseFields };
  }

  /**
   * Create a new document with ownership and versioning
   */
  async create(data, options = {}) {
    try {
      console.log(`🔥 Creating document in ${this.collectionName}:`, data);
      
      // Add ownership fields
      const docData = this.addOwnershipFields(data, false);
      
      // Optimistic UI update
      const optimisticDoc = {
        id: crypto.randomUUID(),
        ...docData,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        _optimistic: true
      };

      if (options.onOptimisticUpdate) {
        options.onOptimisticUpdate(optimisticDoc);
      }

      try {
        // Attempt Firestore write
        const docRef = await addDoc(this.collectionRef, docData);
        console.log(`✅ Document created in Firestore: ${docRef.id}`);
        
        // Get the created document to return with server data
        const createdDoc = await this.getById(docRef.id);
        
        // Update cache if enabled
        if (options.updateCache) {
          this.updateCache(createdDoc);
        }

        if (options.onSuccess) {
          options.onSuccess(createdDoc);
        }

        return createdDoc;
      } catch (error) {
        console.error(`❌ Firestore create failed for ${this.collectionName}:`, error);
        
        // Rollback optimistic update
        if (options.onRollback) {
          options.onRollback(optimisticDoc);
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Error in create operation:', error);
      throw new Error(`فشل في إنشاء ${this.collectionName}: ${error.message}`);
    }
  }

  /**
   * Update an existing document with ownership verification
   */
  async update(id, data, options = {}) {
    try {
      console.log(`🔥 Updating document ${id} in ${this.collectionName}:`, data);
      
      const docRef = doc(db, this.collectionName, id);
      
      // Verify ownership first
      const existingDoc = await getDoc(docRef);
      if (!existingDoc.exists()) {
        throw new Error('Document not found');
      }
      
      const existingData = existingDoc.data();
      const currentUserId = this.getCurrentUserId();
      
      if (existingData.ownerId !== currentUserId) {
        throw new Error('Unauthorized to update this document');
      }

      // Add updated timestamp and increment version
      const updateData = this.addOwnershipFields(data, true);
      
      // Optimistic UI update
      const optimisticDoc = {
        id,
        ...existingData,
        ...data,
        updatedAt: new Date(),
        version: (existingData.version || 1) + 1,
        _optimistic: true
      };

      if (options.onOptimisticUpdate) {
        options.onOptimisticUpdate(optimisticDoc);
      }

      try {
        // Attempt Firestore update
        await updateDoc(docRef, updateData);
        console.log(`✅ Document updated in Firestore: ${id}`);
        
        // Get updated document
        const updatedDoc = await this.getById(id);
        
        // Update cache if enabled
        if (options.updateCache) {
          this.updateCache(updatedDoc);
        }

        if (options.onSuccess) {
          options.onSuccess(updatedDoc);
        }

        return updatedDoc;
      } catch (error) {
        console.error(`❌ Firestore update failed for ${this.collectionName}:`, error);
        
        // Rollback optimistic update
        if (options.onRollback) {
          options.onRollback(existingData);
        }
        
        throw error;
      }
    } catch (error) {
      // 🧠 SENIOR REACT: Smart error logging - don't spam console with expected "Document not found" errors
      if (error.message === 'Document not found') {
        // This is expected when trying to update a document that doesn't exist yet
        console.log(`📄 Document not found in ${this.collectionName} - will be handled by caller`);
      } else {
        console.error('Error in update operation:', error);
      }
      throw new Error(`فشل في تحديث ${this.collectionName}: ${error.message}`);
    }
  }

  /**
   * Delete a document with ownership verification
   */
  async delete(id, options = {}) {
    try {
      console.log(`🔥 Deleting document ${id} from ${this.collectionName}`);
      
      const docRef = doc(db, this.collectionName, id);
      
      // Verify ownership first
      const existingDoc = await getDoc(docRef);
      if (!existingDoc.exists()) {
        throw new Error('Document not found');
      }
      
      const existingData = existingDoc.data();
      const currentUserId = this.getCurrentUserId();
      
      if (existingData.ownerId !== currentUserId) {
        throw new Error('Unauthorized to delete this document');
      }

      // Optimistic UI update (remove from UI)
      if (options.onOptimisticUpdate) {
        options.onOptimisticUpdate(null);
      }

      try {
        // Attempt Firestore delete
        await deleteDoc(docRef);
        console.log(`✅ Document deleted from Firestore: ${id}`);
        
        // Remove from cache if enabled
        if (options.updateCache) {
          this.removeFromCache(id);
        }

        if (options.onSuccess) {
          options.onSuccess();
        }

        return true;
      } catch (error) {
        console.error(`❌ Firestore delete failed for ${this.collectionName}:`, error);
        
        // Rollback optimistic update
        if (options.onRollback) {
          options.onRollback(existingData);
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Error in delete operation:', error);
      throw new Error(`فشل في حذف ${this.collectionName}: ${error.message}`);
    }
  }

  /**
   * Get a single document by ID with ownership verification
   */
  async getById(id) {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentUserId = this.getCurrentUserId();
        
        // Verify ownership
        if (data.ownerId !== currentUserId) {
          throw new Error('Unauthorized to access this document');
        }
        
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching document by ID:', error);
      throw new Error(`فشل في جلب ${this.collectionName}: ${error.message}`);
    }
  }

  /**
   * Get all documents for the current user
   */
  async getAll(options = {}) {
    try {
      const currentUserId = this.getCurrentUserId();
      
      // Build query with ownership filter
      let q = query(
        this.collectionRef,
        where('ownerId', '==', currentUserId)
      );

      // ⚠️ TEMPORARILY DISABLE ORDERING: To avoid Firebase index requirement
      // Firebase requires composite index for where() + orderBy() combination
      // TODO: Create index or handle ordering client-side
      
      // Add limit if specified (but skip ordering to avoid index requirement)
      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      const querySnapshot = await getDocs(q);
      
      const documents = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });

      console.log(`✅ Retrieved ${documents.length} documents from ${this.collectionName}`);
      
      // Update cache if enabled
      if (options.updateCache) {
        this.setCacheAll(documents);
      }

      return documents;
    } catch (error) {
      console.error('Error fetching all documents:', error);
      throw new Error(`فشل في جلب ${this.collectionName}: ${error.message}`);
    }
  }

  /**
   * Search documents with ownership filtering
   */
  async search(searchTerm, searchFields = [], options = {}) {
    try {
      const currentUserId = this.getCurrentUserId();
      
      // Get all documents first (Firestore doesn't support full-text search)
      const q = query(
        this.collectionRef,
        where('ownerId', '==', currentUserId)
      );

      const querySnapshot = await getDocs(q);
      
      const allDocs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });

      // Client-side filtering for Arabic/English search
      const filteredDocs = allDocs.filter(doc => {
        return searchFields.some(field => {
          const fieldValue = doc[field];
          if (typeof fieldValue === 'string') {
            return fieldValue.toLowerCase().includes(searchTerm.toLowerCase());
          }
          return false;
        });
      });

      console.log(`✅ Found ${filteredDocs.length} matching documents in ${this.collectionName}`);
      return filteredDocs;
    } catch (error) {
      console.error('Error searching documents:', error);
      throw new Error(`فشل في البحث في ${this.collectionName}: ${error.message}`);
    }
  }

  /**
   * Batch operations with ownership verification
   */
  async batchOperation(operations) {
    try {
      const batch = writeBatch(db);
      const currentUserId = this.getCurrentUserId();

      for (const operation of operations) {
        const { type, id, data } = operation;
        
        if (type === 'create') {
          const docRef = doc(this.collectionRef);
          const docData = this.addOwnershipFields(data, false);
          batch.set(docRef, docData);
        } else if (type === 'update') {
          const docRef = doc(db, this.collectionName, id);
          
          // Verify ownership for updates
          const existingDoc = await getDoc(docRef);
          if (existingDoc.exists() && existingDoc.data().ownerId !== currentUserId) {
            throw new Error(`Unauthorized to update document ${id}`);
          }
          
          const updateData = this.addOwnershipFields(data, true);
          batch.update(docRef, updateData);
        } else if (type === 'delete') {
          const docRef = doc(db, this.collectionName, id);
          
          // Verify ownership for deletes
          const existingDoc = await getDoc(docRef);
          if (existingDoc.exists() && existingDoc.data().ownerId !== currentUserId) {
            throw new Error(`Unauthorized to delete document ${id}`);
          }
          
          batch.delete(docRef);
        }
      }

      await batch.commit();
      console.log(`✅ Batch operation completed for ${this.collectionName}`);
      return true;
    } catch (error) {
      console.error('Error in batch operation:', error);
      throw new Error(`فشل في العملية المجمعة لـ ${this.collectionName}: ${error.message}`);
    }
  }

  // Cache management methods (optional read-only cache)
  getCacheKey() {
    return `firestore_cache_${this.collectionName}`;
  }

  updateCache(document) {
    try {
      const cacheKey = this.getCacheKey();
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      const index = cached.findIndex(doc => doc.id === document.id);
      
      if (index >= 0) {
        cached[index] = { 
          ...document, 
          _cached: true, 
          _cachedAt: Date.now(),
          _checksum: this.generateChecksum(document)
        };
      } else {
        cached.push({ 
          ...document, 
          _cached: true, 
          _cachedAt: Date.now(),
          _checksum: this.generateChecksum(document)
        });
      }
      
      localStorage.setItem(cacheKey, JSON.stringify(cached));
    } catch (error) {
      console.warn('Cache update failed:', error);
    }
  }

  setCacheAll(documents) {
    try {
      const cacheKey = this.getCacheKey();
      const cachedDocs = documents.map(doc => ({
        ...doc,
        _cached: true,
        _cachedAt: Date.now(),
        _checksum: this.generateChecksum(doc)
      }));
      
      localStorage.setItem(cacheKey, JSON.stringify(cachedDocs));
    } catch (error) {
      console.warn('Cache set all failed:', error);
    }
  }

  removeFromCache(id) {
    try {
      const cacheKey = this.getCacheKey();
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      const filtered = cached.filter(doc => doc.id !== id);
      localStorage.setItem(cacheKey, JSON.stringify(filtered));
    } catch (error) {
      console.warn('Cache remove failed:', error);
    }
  }

  getFromCache() {
    try {
      const cacheKey = this.getCacheKey();
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.warn('Cache read failed:', error);
      return [];
    }
  }

  generateChecksum(document) {
    // Simple checksum based on JSON string hash
    const str = JSON.stringify(document);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  validateCacheIntegrity(cachedDoc, firestoreDoc) {
    const cachedChecksum = cachedDoc._checksum;
    const currentChecksum = this.generateChecksum(firestoreDoc);
    return cachedChecksum === currentChecksum;
  }
}

export default FirebaseService;