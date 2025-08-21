import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase.js';
import { generateId } from '../utils/idGenerator.js';

export class SimpleTenderItemsService {
  
  /**
   * Get all tender items for a tender (Firebase with SessionDataService fallback)
   */
  static async getTenderItems(tenderId) {
    try {
      console.log('📦 Getting tender items for:', tenderId);
      
      // Try Firebase first for existing tenders
      if (tenderId && tenderId !== 'new') {
        try {
          const q = query(
            collection(db, 'tenderItems'), 
            where('tenderId', '==', tenderId)
          );
          const querySnapshot = await getDocs(q);
          
          const items = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt?.toDate() || new Date(),
            updatedAt: docSnap.data().updatedAt?.toDate() || new Date()
          }));
          
          console.log('✅ Firebase: Got tender items:', items.length);
          return items;
          
        } catch (firebaseError) {
          console.error('❌ Firebase failed, using sessionDataService:', firebaseError);
        }
      }
      
      // Fallback to sessionDataService
      const items = await sessionDataService.getSessionData(`tenderItems_${tenderId || 'new'}`) || [];
      console.log('📦 sessionDataService: Got tender items:', items.length);
      return Array.isArray(items) ? items : [];
      
    } catch (error) {
      console.error('❌ Error getting tender items:', error);
      return [];
    }
  }
  
  /**
   * Add material to tender (Firebase with sessionDataService backup)
   */
  static async addMaterialToTender(tenderId, materialData) {
    try {
      console.log('📦 Adding material to tender:', { tenderId, materialData });
      
      const tenderItem = {
        internalId: generateId('TENDER_ITEM'),
        tenderId: tenderId,
        materialInternalId: materialData.materialInternalId,
        materialType: materialData.materialType,
        materialName: materialData.materialName,
        quantity: parseInt(materialData.quantity) || 1,
        unitPrice: parseFloat(materialData.unitPrice) || 0,
        totalPrice: (parseInt(materialData.quantity) || 1) * (parseFloat(materialData.unitPrice) || 0),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Try Firebase for existing tenders
      if (tenderId && tenderId !== 'new') {
        try {
          const docRef = await addDoc(collection(db, 'tenderItems'), {
            ...tenderItem,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          console.log('✅ Firebase: Added tender item:', docRef.id);
          return { id: docRef.id, ...tenderItem };
          
        } catch (firebaseError) {
          console.error('❌ Firebase add failed, using sessionDataService:', firebaseError);
        }
      }
      
      // Add to sessionDataService
      const currentItems = await this.getTenderItems(tenderId);
      const updatedItems = [...currentItems, tenderItem];
      await sessionDataService.setSessionData(`tenderItems_${tenderId || 'new'}`, updatedItems);
      
      console.log('📦 sessionDataService: Added tender item');
      return tenderItem;
      
    } catch (error) {
      console.error('❌ Error adding material to tender:', error);
      throw error;
    }
  }
  
  /**
   * Delete tender item (Firebase with sessionDataService backup)
   */
  static async deleteTenderItem(itemId, tenderId) {
    try {
      console.log('🗑️ Deleting tender item:', { itemId, tenderId });
      
      // Try Firebase for items with Firebase ID
      if (itemId && !itemId.startsWith('TENDER_ITEM_')) {
        try {
          await deleteDoc(doc(db, 'tenderItems', itemId));
          console.log('✅ Firebase: Deleted tender item');
          return true;
        } catch (firebaseError) {
          console.error('❌ Firebase delete failed:', firebaseError);
        }
      }
      
      // Remove from sessionDataService
      const currentItems = await this.getTenderItems(tenderId);
      const updatedItems = currentItems.filter(item => 
        item.id !== itemId && item.internalId !== itemId
      );
      await sessionDataService.setSessionData(`tenderItems_${tenderId || 'new'}`, updatedItems);
      
      console.log('📦 sessionDataService: Deleted tender item');
      return true;
      
    } catch (error) {
      console.error('❌ Error deleting tender item:', error);
      throw error;
    }
  }
  
  /**
   * Test Firebase connection
   */
  static async testConnection() {
    try {
      const testRef = collection(db, 'tenderItems');
      await getDocs(query(testRef));
      console.log('✅ Firebase connection test passed');
      return true;
    } catch (error) {
      console.error('❌ Firebase connection test failed:', error);
      return false;
    }
  }
}

export default SimpleTenderItemsService;