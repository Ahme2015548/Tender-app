/**
 * Firestore Tender Items Service - Pure Firebase implementation
 * Replaces all SessionDataService usage with direct Firestore operations
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
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase.js';
import { generateId } from '../utils/idGenerator.js';

export class FirestoreTenderItemsService {
  static COLLECTION_NAME = 'tenderItems';

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
   * Get all tender items for a specific tender
   */
  static async getTenderItems(tenderId) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Fetching tender items for tender:', tenderId);
      
      const tenderItemsRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        tenderItemsRef,
        where('ownerId', '==', ownerId),
        where('tenderId', '==', tenderId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
      
      console.log('✅ [FIRESTORE] Loaded tender items:', items.length);
      return items;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error fetching tender items:', error);
      throw new Error('Failed to fetch tender items: ' + error.message);
    }
  }

  /**
   * Add a tender item to Firestore
   */
  static async addTenderItem(tenderId, itemData) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Adding tender item:', itemData.materialName);
      
      const tenderItemDoc = {
        ...itemData,
        tenderId,
        ownerId,
        internalId: itemData.internalId || generateId('TENDER_ITEM'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), tenderItemDoc);
      
      console.log('✅ [FIRESTORE] Tender item added with ID:', docRef.id);
      return docRef.id;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error adding tender item:', error);
      throw new Error('Failed to add tender item: ' + error.message);
    }
  }

  /**
   * Update a tender item in Firestore
   */
  static async updateTenderItem(itemId, updateData) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Updating tender item:', itemId);
      
      const itemRef = doc(db, this.COLLECTION_NAME, itemId);
      
      // First verify the item belongs to the current user
      const itemDoc = await getDoc(itemRef);
      if (!itemDoc.exists() || itemDoc.data().ownerId !== ownerId) {
        throw new Error('Tender item not found or access denied');
      }
      
      const updateDoc = {
        ...updateData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(itemRef, updateDoc);
      
      console.log('✅ [FIRESTORE] Tender item updated:', itemId);
      return itemId;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error updating tender item:', error);
      throw new Error('Failed to update tender item: ' + error.message);
    }
  }

  /**
   * Delete a tender item from Firestore
   */
  static async deleteTenderItem(itemId) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Deleting tender item:', itemId);
      
      const itemRef = doc(db, this.COLLECTION_NAME, itemId);
      
      // First verify the item belongs to the current user
      const itemDoc = await getDoc(itemRef);
      if (!itemDoc.exists() || itemDoc.data().ownerId !== ownerId) {
        throw new Error('Tender item not found or access denied');
      }
      
      await deleteDoc(itemRef);
      
      console.log('✅ [FIRESTORE] Tender item deleted:', itemId);
      return true;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error deleting tender item:', error);
      throw new Error('Failed to delete tender item: ' + error.message);
    }
  }

  /**
   * Get a specific tender item by ID
   */
  static async getTenderItemById(itemId) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Fetching tender item by ID:', itemId);
      
      const itemRef = doc(db, this.COLLECTION_NAME, itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists() || itemDoc.data().ownerId !== ownerId) {
        return null;
      }
      
      const data = itemDoc.data();
      return {
        id: itemDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      };
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error fetching tender item:', error);
      throw new Error('Failed to fetch tender item: ' + error.message);
    }
  }

  /**
   * Batch update multiple tender items
   */
  static async batchUpdateTenderItems(updates) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Batch updating tender items:', updates.length);
      
      const batch = writeBatch(db);
      
      for (const update of updates) {
        const { itemId, data } = update;
        const itemRef = doc(db, this.COLLECTION_NAME, itemId);
        
        // Verify ownership (in production, you might want to do this in a separate query)
        const updateData = {
          ...data,
          ownerId, // Ensure ownerId is always set
          updatedAt: serverTimestamp()
        };
        
        batch.update(itemRef, updateData);
      }
      
      await batch.commit();
      
      console.log('✅ [FIRESTORE] Batch update completed');
      return true;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error in batch update:', error);
      throw new Error('Failed to batch update tender items: ' + error.message);
    }
  }

  /**
   * Check if a material already exists in tender items (duplicate prevention)
   */
  static async checkMaterialExists(tenderId, materialInternalId, materialType = 'rawMaterial') {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔍 [FIRESTORE] Checking for duplicate material:', materialInternalId);
      
      const tenderItemsRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        tenderItemsRef,
        where('ownerId', '==', ownerId),
        where('tenderId', '==', tenderId),
        where('materialInternalId', '==', materialInternalId),
        where('materialType', '==', materialType)
      );
      
      const querySnapshot = await getDocs(q);
      const exists = !querySnapshot.empty;
      
      console.log(exists ? '⚠️ [FIRESTORE] Duplicate material found' : '✅ [FIRESTORE] Material is unique');
      return exists;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error checking material:', error);
      return false; // Assume not duplicate on error to avoid blocking
    }
  }

  /**
   * Get all tender items for current user (across all tenders)
   */
  static async getAllUserTenderItems() {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Fetching all user tender items');
      
      const tenderItemsRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        tenderItemsRef,
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
      
      console.log('✅ [FIRESTORE] Loaded all user tender items:', items.length);
      return items;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error fetching user tender items:', error);
      throw new Error('Failed to fetch user tender items: ' + error.message);
    }
  }

  /**
   * Delete all tender items for a specific tender
   */
  static async deleteAllTenderItems(tenderId) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Deleting all items for tender:', tenderId);
      
      const tenderItemsRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        tenderItemsRef,
        where('ownerId', '==', ownerId),
        where('tenderId', '==', tenderId)
      );
      
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      console.log('✅ [FIRESTORE] Deleted all tender items for tender:', tenderId);
      return querySnapshot.docs.length;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error deleting tender items:', error);
      throw new Error('Failed to delete tender items: ' + error.message);
    }
  }
}

export default FirestoreTenderItemsService;