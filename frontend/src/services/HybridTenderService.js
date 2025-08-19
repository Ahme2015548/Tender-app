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
  serverTimestamp
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from './firebase.js';

/**
 * Hybrid service that supplements localStorage with Firebase persistence
 * Keeps existing localStorage functionality working while adding Firebase sync
 */
export class HybridTenderService {
  
  /**
   * Check if user is authenticated, sign in anonymously if needed
   */
  static async ensureAuth() {
    try {
      if (!auth.currentUser) {
        console.log('🔐 [HYBRID] No authenticated user, signing in anonymously...');
        await signInAnonymously(auth);
        console.log('✅ [HYBRID] Anonymous authentication successful');
      }
      console.log('✅ [HYBRID] User authenticated:', auth.currentUser.uid);
      return true;
    } catch (error) {
      console.error('❌ [HYBRID] Authentication failed:', error);
      return false;
    }
  }
  
  /**
   * Save tender items to Firebase (supplements localStorage)
   * @param {string} tenderId - Tender ID
   * @param {Array} items - Tender items array
   */
  static async saveTenderItemsToFirebase(tenderId, items) {
    try {
      console.log('🔥 [HYBRID] Saving tender items to Firebase:', { tenderId, itemsCount: items.length });
      
      if (!tenderId || tenderId === 'new' || !Array.isArray(items) || items.length === 0) {
        console.log('⚠️ [HYBRID] Skipping Firebase save - invalid data');
        return;
      }
      
      // Ensure authentication
      const authSuccess = await this.ensureAuth();
      if (!authSuccess) {
        console.log('⚠️ [HYBRID] Skipping Firebase save - authentication failed');
        return;
      }
      
      // Save as embedded document array in tender document (simple approach)
      const tenderRef = doc(db, 'tenders', tenderId);
      
      const itemsForFirebase = items.map(item => ({
        internalId: item.internalId,
        materialInternalId: item.materialInternalId || item.id,
        materialName: item.materialName || item.name,
        materialCategory: item.materialCategory || item.category,
        materialUnit: item.materialUnit || item.unit,
        materialType: item.materialType || item.type || 'rawMaterial',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.price || 0,
        totalPrice: item.totalPrice || 0,
        supplierInfo: item.supplierInfo || item.supplier || item.displaySupplier,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      await updateDoc(tenderRef, {
        tenderItems: itemsForFirebase,
        lastItemUpdate: serverTimestamp()
      });
      
      console.log('✅ [HYBRID] Successfully saved tender items to Firebase');
      
    } catch (error) {
      console.error('❌ [HYBRID] Error saving tender items to Firebase:', error);
      // Don't throw - let localStorage continue working
    }
  }
  
  /**
   * Load tender items from Firebase (supplements localStorage)
   * @param {string} tenderId - Tender ID  
   * @returns {Array} Array of tender items
   */
  static async loadTenderItemsFromFirebase(tenderId) {
    try {
      console.log('🔥 [HYBRID] Loading tender items from Firebase:', tenderId);
      
      if (!tenderId || tenderId === 'new') {
        return [];
      }
      
      // Ensure authentication  
      const authSuccess = await this.ensureAuth();
      if (!authSuccess) {
        return [];
      }
      
      const tenderRef = doc(db, 'tenders', tenderId);
      const tenderDoc = await getDoc(tenderRef);
      
      if (tenderDoc.exists()) {
        const data = tenderDoc.data();
        const items = data.tenderItems || [];
        
        console.log('✅ [HYBRID] Loaded tender items from Firebase:', items.length);
        return items;
      } else {
        console.log('ℹ️ [HYBRID] No tender document found in Firebase');
        return [];
      }
      
    } catch (error) {
      console.error('❌ [HYBRID] Error loading tender items from Firebase:', error);
      return [];
    }
  }
  
  /**
   * Test Firebase connection
   * @returns {boolean} Connection status
   */
  static async testFirebaseConnection() {
    try {
      console.log('🔥 [HYBRID] Testing Firebase connection...');
      const testRef = collection(db, 'tenders');
      await getDocs(query(testRef, where('__test__', '==', 'connection_test')));
      console.log('✅ [HYBRID] Firebase connection successful');
      return true;
    } catch (error) {
      console.error('❌ [HYBRID] Firebase connection failed:', error);
      return false;
    }
  }
}

export default HybridTenderService;