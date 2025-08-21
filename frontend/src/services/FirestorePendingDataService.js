/**
 * Firestore Pending Data Service - Pure Firebase implementation
 * Replaces SessionDataService completely with Firestore-backed temporary data
 * All data is tied to authenticated user with ownerId security
 * Data expires automatically and is cleaned up
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './firebase.js';

export class FirestorePendingDataService {
  static COLLECTION_NAME = 'pendingData';
  static DEFAULT_EXPIRY_HOURS = 24; // Data expires after 24 hours

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
   * Create expiry timestamp
   */
  static createExpiryTimestamp(hours = this.DEFAULT_EXPIRY_HOURS) {
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + hours);
    return Timestamp.fromDate(expiryTime);
  }

  /**
   * Set pending data with automatic expiry
   */
  static async setPendingData(key, data, expiryHours = this.DEFAULT_EXPIRY_HOURS) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Setting pending data:', key);
      
      const docRef = doc(db, this.COLLECTION_NAME, `${ownerId}_${key}`);
      const pendingDoc = {
        ownerId,
        key,
        data,
        expiresAt: this.createExpiryTimestamp(expiryHours),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(docRef, pendingDoc);
      
      console.log('✅ [FIRESTORE] Pending data set:', key);
      return true;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error setting pending data:', error);
      throw new Error('Failed to set pending data: ' + error.message);
    }
  }

  /**
   * Get pending data by key
   */
  static async getPendingData(key) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Getting pending data:', key);
      
      const docRef = doc(db, this.COLLECTION_NAME, `${ownerId}_${key}`);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.log('📭 [FIRESTORE] No pending data found for key:', key);
        return null;
      }
      
      const docData = docSnap.data();
      
      // Check if data has expired
      if (docData.expiresAt && docData.expiresAt.toDate() < new Date()) {
        console.log('⏰ [FIRESTORE] Pending data expired, cleaning up:', key);
        await this.clearPendingData(key);
        return null;
      }
      
      console.log('✅ [FIRESTORE] Retrieved pending data:', key);
      return docData.data;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error getting pending data:', error);
      return null; // Return null on error to avoid blocking app
    }
  }

  /**
   * Clear specific pending data
   */
  static async clearPendingData(key) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Clearing pending data:', key);
      
      const docRef = doc(db, this.COLLECTION_NAME, `${ownerId}_${key}`);
      await deleteDoc(docRef);
      
      console.log('✅ [FIRESTORE] Pending data cleared:', key);
      return true;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error clearing pending data:', error);
      return false;
    }
  }

  /**
   * Get all pending data for current user
   */
  static async getAllPendingData() {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Getting all pending data');
      
      const pendingRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        pendingRef,
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const pendingData = {};
      const expiredKeys = [];
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Check if data has expired
        if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
          expiredKeys.push(data.key);
        } else {
          pendingData[data.key] = data.data;
        }
      });
      
      // Clean up expired data
      if (expiredKeys.length > 0) {
        await this.clearMultiplePendingData(expiredKeys);
      }
      
      console.log('✅ [FIRESTORE] Retrieved all pending data, keys:', Object.keys(pendingData));
      return pendingData;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error getting all pending data:', error);
      return {};
    }
  }

  /**
   * Clear multiple pending data keys
   */
  static async clearMultiplePendingData(keys) {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Clearing multiple pending data:', keys.length);
      
      const batch = writeBatch(db);
      
      keys.forEach(key => {
        const docRef = doc(db, this.COLLECTION_NAME, `${ownerId}_${key}`);
        batch.delete(docRef);
      });
      
      await batch.commit();
      
      console.log('✅ [FIRESTORE] Multiple pending data cleared');
      return true;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error clearing multiple pending data:', error);
      return false;
    }
  }

  /**
   * Clear all pending data for current user
   */
  static async clearAllPendingData() {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Clearing all pending data');
      
      const pendingRef = collection(db, this.COLLECTION_NAME);
      const q = query(pendingRef, where('ownerId', '==', ownerId));
      
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      console.log('✅ [FIRESTORE] All pending data cleared:', querySnapshot.docs.length);
      return querySnapshot.docs.length;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error clearing all pending data:', error);
      return 0;
    }
  }

  /**
   * Clean up expired data (can be called periodically)
   */
  static async cleanupExpiredData() {
    try {
      const ownerId = this.getCurrentUserId();
      console.log('🔥 [FIRESTORE] Cleaning up expired data');
      
      const pendingRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        pendingRef,
        where('ownerId', '==', ownerId),
        where('expiresAt', '<', Timestamp.now())
      );
      
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      console.log('✅ [FIRESTORE] Expired data cleaned up:', querySnapshot.docs.length);
      return querySnapshot.docs.length;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error cleaning up expired data:', error);
      return 0;
    }
  }

  // Specific methods for common use cases (to match SessionDataService API)
  
  /**
   * Set pending tender items
   */
  static async setPendingTenderItems(items) {
    return this.setPendingData('pendingTenderItems', items, 48); // 48 hours for tender items
  }

  /**
   * Get pending tender items
   */
  static async getPendingTenderItems() {
    return this.getPendingData('pendingTenderItems');
  }

  /**
   * Clear pending tender items
   */
  static async clearPendingTenderItems() {
    return this.clearPendingData('pendingTenderItems');
  }

  /**
   * Merge new items with existing pending tender items
   */
  static async mergePendingTenderItems(newItems) {
    try {
      console.log('🔄 [FIRESTORE] Merging pending tender items:', newItems.length);
      
      // Get existing items
      const existingItems = await this.getPendingTenderItems() || [];
      
      // Merge with new items (new items come from material pages)
      const allItems = [...existingItems, ...newItems];
      
      // Save merged result
      await this.setPendingTenderItems(allItems);
      
      console.log('✅ [FIRESTORE] Pending tender items merged:', {
        existing: existingItems.length,
        new: newItems.length,
        total: allItems.length
      });
      
      return true;
    } catch (error) {
      console.error('❌ [FIRESTORE] Error merging pending tender items:', error);
      throw new Error('Failed to merge pending tender items: ' + error.message);
    }
  }

  /**
   * Set pending product items
   */
  static async setPendingProductItems(items) {
    return this.setPendingData('pendingProductItems', items, 48);
  }

  /**
   * Get pending product items
   */
  static async getPendingProductItems() {
    return this.getPendingData('pendingProductItems');
  }

  /**
   * Clear pending product items
   */
  static async clearPendingProductItems() {
    return this.clearPendingData('pendingProductItems');
  }

  /**
   * Merge new items with existing pending product items
   */
  static async mergePendingProductItems(newItems) {
    try {
      console.log('🔄 [FIRESTORE] Merging pending product items:', newItems.length);
      
      // Get existing items
      const existingItems = await this.getPendingProductItems() || [];
      
      // Merge with new items (new items come from material pages)
      const allItems = [...existingItems, ...newItems];
      
      // Save merged result
      await this.setPendingProductItems(allItems);
      
      console.log('✅ [FIRESTORE] Pending product items merged:', {
        existing: existingItems.length,
        new: newItems.length,
        total: allItems.length
      });
      
      return true;
    } catch (error) {
      console.error('❌ [FIRESTORE] Error merging pending product items:', error);
      throw new Error('Failed to merge pending product items: ' + error.message);
    }
  }

  /**
   * Set session data (generic method)
   */
  static async setSessionData(key, data, expiryHours = 24) {
    return this.setPendingData(key, data, expiryHours);
  }

  /**
   * Get session data (generic method)
   */
  static async getSessionData(key) {
    return this.getPendingData(key);
  }

  /**
   * Clear session data (generic method)
   */
  static async clearSessionData(key) {
    return this.clearPendingData(key);
  }
}

export default FirestorePendingDataService;