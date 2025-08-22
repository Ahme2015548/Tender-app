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
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase.js';
import { generateId } from '../utils/idGenerator.js';
import { RawMaterialService } from './rawMaterialService.js';
import { LocalProductService } from './localProductService.js';
import { ForeignProductService } from './foreignProductService.js';

const TENDER_ITEMS_COLLECTION = 'tenderItems';

// Real-time sync trigger
const triggerDataSync = () => {
  window.dispatchEvent(new CustomEvent('tenderItemsUpdated', {
    detail: { timestamp: Date.now() }
  }));
};

export class UnifiedTenderItemsService {
  
  /**
   * Get all tender items for a specific tender from Firebase
   * @param {string} tenderId - Tender ID (Firebase document ID or internal ID)
   * @returns {Array} Array of tender items with resolved material data
   */
  static async getTenderItems(tenderId) {
    try {
      console.log('🔥 [UNIFIED] Fetching tender items for tender:', tenderId);
      
      const tenderItemsRef = collection(db, TENDER_ITEMS_COLLECTION);
      
      let querySnapshot;
      try {
        const q = query(
          tenderItemsRef, 
          where('tenderId', '==', tenderId),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (orderError) {
        console.log('⚠️ OrderBy failed, using simple query');
        const q = query(tenderItemsRef, where('tenderId', '==', tenderId));
        querySnapshot = await getDocs(q);
      }
      
      const items = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          internalId: data.internalId || generateId('TENDER_ITEM'),
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });
      
      // Manual sort if orderBy failed
      if (items.length > 0 && !querySnapshot.docs[0].data().createdAt) {
        items.sort((a, b) => (b.createdAt || new Date(0)) - (a.createdAt || new Date(0)));
      }
      
      console.log('✅ [UNIFIED] Fetched tender items from Firebase:', items.length);
      return items;
      
    } catch (error) {
      console.error('❌ [UNIFIED] Error fetching tender items:', error);
      throw new Error(`فشل في جلب بنود المناقصة من Firebase: ${error.message}`);
    }
  }

  /**
   * Add material to tender (Firebase-only, no localStorage)
   * @param {string} tenderId - Tender ID
   * @param {string} materialInternalId - Material internal ID
   * @param {string} materialType - Material type (rawMaterial, localProduct, foreignProduct)
   * @param {number} quantity - Quantity
   * @returns {Object} Created tender item
   */
  static async addMaterialToTender(tenderId, materialInternalId, materialType, quantity = 1) {
    try {
      console.log('🔥 [UNIFIED] Adding material to tender Firebase:', { 
        tenderId, materialInternalId, materialType, quantity 
      });
      
      // Check for duplicates in Firebase
      const existingItems = await this.getTenderItems(tenderId);
      const duplicate = existingItems.find(item => 
        item.materialInternalId === materialInternalId && 
        item.materialType === materialType
      );
      
      if (duplicate) {
        console.log('⚠️ [UNIFIED] Duplicate found, updating quantity');
        const newQuantity = (duplicate.quantity || 1) + quantity;
        return await this.updateTenderItemQuantity(duplicate.id, newQuantity);
      }
      
      // Get material details based on type
      let materialDetails = null;
      
      switch (materialType) {
        case 'rawMaterial':
          materialDetails = await RawMaterialService.getRawMaterialByInternalId(materialInternalId);
          break;
        case 'localProduct':
          materialDetails = await LocalProductService.getLocalProductByInternalId(materialInternalId);
          break;
        case 'foreignProduct':
          materialDetails = await ForeignProductService.getForeignProductByInternalId(materialInternalId);
          break;
        default:
          throw new Error(`نوع المادة غير مدعوم: ${materialType}`);
      }
      
      if (!materialDetails) {
        throw new Error(`لا يمكن العثور على المادة: ${materialInternalId}`);
      }
      
      // Calculate pricing
      const parsedQuantity = parseFloat(quantity) || 1;
      const unitPrice = this.calculateMaterialPrice(materialDetails);
      const totalPrice = parsedQuantity * unitPrice;
      
      // Create tender item document
      const tenderItemDoc = {
        internalId: generateId('TENDER_ITEM'),
        tenderId: tenderId,
        materialInternalId: materialInternalId,
        materialType: materialType,
        materialName: materialDetails.name,
        materialCategory: materialDetails.category,
        materialUnit: materialDetails.unit,
        quantity: parsedQuantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        supplierInfo: this.getSupplierInfo(materialDetails),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, TENDER_ITEMS_COLLECTION), tenderItemDoc);
      console.log('✅ [UNIFIED] Added tender item to Firebase with ID:', docRef.id);
      
      triggerDataSync();
      
      return {
        id: docRef.id,
        ...tenderItemDoc,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error('❌ [UNIFIED] Error adding material to tender:', error);
      throw new Error(`فشل في إضافة المادة للمناقصة: ${error.message}`);
    }
  }

  /**
   * Bulk add multiple materials to tender (Firebase-only)
   * @param {string} tenderId - Tender ID
   * @param {Array} materials - Array of materials to add
   * @returns {Array} Array of created tender items
   */
  static async addMultipleMaterialsToTender(tenderId, materials) {
    try {
      console.log('🔥 [UNIFIED] Bulk adding materials to Firebase:', { tenderId, count: materials.length });
      
      if (!Array.isArray(materials) || materials.length === 0) {
        return [];
      }
      
      const batch = writeBatch(db);
      const addedItems = [];
      
      // Get existing items to check for duplicates
      const existingItems = await this.getTenderItems(tenderId);
      const existingKeys = new Set(
        existingItems.map(item => `${item.materialInternalId}_${item.materialType}`)
      );
      
      for (const material of materials) {
        const materialKey = `${material.materialInternalId}_${material.materialType}`;
        
        // Skip duplicates
        if (existingKeys.has(materialKey)) {
          console.log('⚠️ [UNIFIED] Skipping duplicate:', material.materialInternalId);
          continue;
        }
        
        // Get material details based on type
        let materialDetails = null;
        
        switch (material.materialType) {
          case 'rawMaterial':
            materialDetails = await RawMaterialService.getRawMaterialByInternalId(material.materialInternalId);
            break;
          case 'localProduct':
            materialDetails = await LocalProductService.getLocalProductByInternalId(material.materialInternalId);
            break;
          case 'foreignProduct':
            materialDetails = await ForeignProductService.getForeignProductByInternalId(material.materialInternalId);
            break;
        }
        
        if (materialDetails) {
          const quantity = parseFloat(material.quantity) || 1;
          const unitPrice = this.calculateMaterialPrice(materialDetails);
          const totalPrice = quantity * unitPrice;
          
          const tenderItemDoc = {
            internalId: generateId('TENDER_ITEM'),
            tenderId: tenderId,
            materialInternalId: material.materialInternalId,
            materialType: material.materialType,
            materialName: materialDetails.name,
            materialCategory: materialDetails.category,
            materialUnit: materialDetails.unit,
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: totalPrice,
            supplierInfo: this.getSupplierInfo(materialDetails),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          const newDocRef = doc(collection(db, TENDER_ITEMS_COLLECTION));
          batch.set(newDocRef, tenderItemDoc);
          
          addedItems.push({
            id: newDocRef.id,
            ...tenderItemDoc,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
      
      if (addedItems.length > 0) {
        await batch.commit();
        console.log('✅ [UNIFIED] Bulk added items to Firebase:', addedItems.length);
      }
      
      triggerDataSync();
      return addedItems;
      
    } catch (error) {
      console.error('❌ [UNIFIED] Error bulk adding materials:', error);
      throw new Error(`فشل في إضافة المواد للمناقصة: ${error.message}`);
    }
  }

  /**
   * Update tender item quantity (Firebase-only)
   * @param {string} itemId - Firebase document ID
   * @param {number} newQuantity - New quantity
   * @returns {Object} Updated tender item
   */
  static async updateTenderItemQuantity(itemId, newQuantity) {
    try {
      console.log('🔥 [UNIFIED] Updating item quantity in Firebase:', { itemId, newQuantity });
      
      const item = await this.getTenderItemById(itemId);
      if (!item) {
        throw new Error('البند غير موجود في Firebase');
      }
      
      const parsedQuantity = parseFloat(newQuantity) || 1;
      const newTotalPrice = parsedQuantity * (item.unitPrice || 0);
      
      const itemRef = doc(db, TENDER_ITEMS_COLLECTION, itemId);
      await updateDoc(itemRef, {
        quantity: parsedQuantity,
        totalPrice: newTotalPrice,
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ [UNIFIED] Updated tender item quantity in Firebase');
      triggerDataSync();
      
      return {
        ...item,
        quantity: parsedQuantity,
        totalPrice: newTotalPrice,
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error('❌ [UNIFIED] Error updating quantity:', error);
      throw new Error(`فشل في تحديث كمية البند: ${error.message}`);
    }
  }

  /**
   * Delete tender item from Firebase
   * @param {string} itemId - Firebase document ID
   * @returns {boolean} Success status
   */
  static async deleteTenderItem(itemId) {
    try {
      console.log('🔥 [UNIFIED] Deleting tender item from Firebase:', itemId);
      
      const itemRef = doc(db, TENDER_ITEMS_COLLECTION, itemId);
      await deleteDoc(itemRef);
      
      console.log('✅ [UNIFIED] Deleted tender item from Firebase');
      triggerDataSync();
      
      return true;
      
    } catch (error) {
      console.error('❌ [UNIFIED] Error deleting tender item:', error);
      throw new Error(`فشل في حذف البند: ${error.message}`);
    }
  }

  /**
   * Get single tender item by Firebase ID
   * @param {string} itemId - Firebase document ID
   * @returns {Object|null} Tender item
   */
  static async getTenderItemById(itemId) {
    try {
      const itemRef = doc(db, TENDER_ITEMS_COLLECTION, itemId);
      const docSnap = await getDoc(itemRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          internalId: data.internalId || generateId('TENDER_ITEM'),
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ [UNIFIED] Error fetching tender item by ID:', error);
      throw new Error(`فشل في جلب بيانات البند: ${error.message}`);
    }
  }

  /**
   * Refresh prices for all items in a tender (Firebase-only)
   * @param {string} tenderId - Tender ID
   * @returns {Array} Updated tender items with refreshed pricing
   */
  static async refreshTenderItemsPricing(tenderId) {
    try {
      console.log('🔥 [UNIFIED] Refreshing prices for tender in Firebase:', tenderId);
      
      const items = await this.getTenderItems(tenderId);
      
      if (items.length === 0) {
        console.log('ℹ️ [UNIFIED] No items to refresh');
        return [];
      }
      
      const updatedItems = [];
      const batch = writeBatch(db);
      let batchUpdates = 0;
      
      for (const item of items) {
        try {
          // Get latest material details based on type
          let materialDetails = null;
          
          switch (item.materialType) {
            case 'rawMaterial':
              materialDetails = await RawMaterialService.getRawMaterialByInternalId(item.materialInternalId);
              break;
            case 'localProduct':
              materialDetails = await LocalProductService.getLocalProductByInternalId(item.materialInternalId);
              break;
            case 'foreignProduct':
              materialDetails = await ForeignProductService.getForeignProductByInternalId(item.materialInternalId);
              break;
          }
          
          if (materialDetails) {
            const newUnitPrice = this.calculateMaterialPrice(materialDetails);
            const newTotalPrice = item.quantity * newUnitPrice;
            
            // Update if price changed
            if (newUnitPrice !== item.unitPrice) {
              const itemRef = doc(db, TENDER_ITEMS_COLLECTION, item.id);
              batch.update(itemRef, {
                unitPrice: newUnitPrice,
                totalPrice: newTotalPrice,
                materialName: materialDetails.name, // Update name if changed
                supplierInfo: this.getSupplierInfo(materialDetails),
                updatedAt: serverTimestamp()
              });
              batchUpdates++;
              
              updatedItems.push({
                ...item,
                unitPrice: newUnitPrice,
                totalPrice: newTotalPrice,
                materialName: materialDetails.name,
                supplierInfo: this.getSupplierInfo(materialDetails)
              });
            } else {
              updatedItems.push(item);
            }
          } else {
            console.warn('⚠️ [UNIFIED] Material not found:', item.materialInternalId);
            updatedItems.push(item);
          }
          
        } catch (itemError) {
          console.error('❌ [UNIFIED] Error refreshing item:', item.materialName, itemError);
          updatedItems.push(item);
        }
      }
      
      // Commit batch updates if any changes
      if (batchUpdates > 0) {
        await batch.commit();
        console.log('✅ [UNIFIED] Batch updated', batchUpdates, 'items in Firebase');
      }
      
      triggerDataSync();
      return updatedItems;
      
    } catch (error) {
      console.error('❌ [UNIFIED] Error refreshing tender items pricing:', error);
      throw new Error(`فشل في تحديث أسعار البنود: ${error.message}`);
    }
  }

  /**
   * Delete all tender items for a tender (Firebase-only)
   * @param {string} tenderId - Tender ID
   * @returns {boolean} Success status
   */
  static async deleteAllTenderItems(tenderId) {
    try {
      console.log('🔥 [UNIFIED] Deleting all items for tender in Firebase:', tenderId);
      
      const items = await this.getTenderItems(tenderId);
      
      if (items.length === 0) {
        return true;
      }
      
      const batch = writeBatch(db);
      
      items.forEach(item => {
        const itemRef = doc(db, TENDER_ITEMS_COLLECTION, item.id);
        batch.delete(itemRef);
      });
      
      await batch.commit();
      
      console.log('✅ [UNIFIED] Deleted all tender items from Firebase:', items.length);
      triggerDataSync();
      
      return true;
      
    } catch (error) {
      console.error('❌ [UNIFIED] Error deleting all tender items:', error);
      throw new Error(`فشل في حذف جميع بنود المناقصة: ${error.message}`);
    }
  }

  /**
   * Get tender totals and summary (Firebase-only)
   * @param {string} tenderId - Tender ID
   * @returns {Object} Tender totals and summary
   */
  static async getTenderTotals(tenderId) {
    try {
      const items = await this.getTenderItems(tenderId);
      
      const totalPrice = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const itemsCount = items.length;
      
      const materialTypeCounts = {
        rawMaterial: items.filter(i => i.materialType === 'rawMaterial').length,
        localProduct: items.filter(i => i.materialType === 'localProduct').length,
        foreignProduct: items.filter(i => i.materialType === 'foreignProduct').length
      };
      
      return {
        totalPrice,
        totalQuantity,
        itemsCount,
        materialTypeCounts,
        items
      };
      
    } catch (error) {
      console.error('❌ [UNIFIED] Error calculating tender totals:', error);
      throw new Error(`فشل في حساب إجماليات المناقصة: ${error.message}`);
    }
  }

  /**
   * Calculate current price from material (including price quotes)
   * @param {Object} material - Material object
   * @returns {number} Current price
   */
  static calculateMaterialPrice(material) {
    try {
      // Check for price quotes first (lowest price wins)
      if (material.priceQuotes && Array.isArray(material.priceQuotes) && material.priceQuotes.length > 0) {
        const lowestQuote = material.priceQuotes.reduce((lowest, current) => {
          const lowestPrice = parseFloat(lowest.price) || 0;
          const currentPrice = parseFloat(current.price) || 0;
          return currentPrice < lowestPrice ? current : lowest;
        });
        return parseFloat(lowestQuote.price) || 0;
      }

      // Fall back to material's base price
      return parseFloat(material.price) || 0;
      
    } catch (error) {
      console.error('Error calculating material price:', error);
      return 0;
    }
  }

  /**
   * Get supplier information from material
   * @param {Object} material - Material object
   * @returns {Object} Supplier information
   */
  static getSupplierInfo(material) {
    try {
      // Check price quotes for supplier info
      if (material.priceQuotes && Array.isArray(material.priceQuotes) && material.priceQuotes.length > 0) {
        const lowestQuote = material.priceQuotes.reduce((lowest, current) => {
          const lowestPrice = parseFloat(lowest.price) || 0;
          const currentPrice = parseFloat(current.price) || 0;
          return currentPrice < lowestPrice ? current : lowest;
        });
        
        return {
          name: lowestQuote.supplierName,
          id: lowestQuote.supplierId || '',
          isFromQuote: true,
          quoteId: lowestQuote.id
        };
      }

      // Fall back to material's supplier/manufacturer
      return {
        name: material.supplier || material.manufacturer || 'غير محدد',
        id: material.supplierId || material.manufacturerId || '',
        isFromQuote: false
      };
      
    } catch (error) {
      console.error('Error getting supplier info:', error);
      return { name: 'غير محدد', id: '', isFromQuote: false };
    }
  }

  /**
   * Check if material exists in tender (Firebase-only)
   * @param {string} tenderId - Tender ID
   * @param {string} materialInternalId - Material internal ID
   * @param {string} materialType - Material type
   * @returns {boolean} Whether material exists in tender
   */
  static async materialExistsInTender(tenderId, materialInternalId, materialType) {
    try {
      const items = await this.getTenderItems(tenderId);
      return items.some(item => 
        item.materialInternalId === materialInternalId && 
        item.materialType === materialType
      );
    } catch (error) {
      console.error('❌ [UNIFIED] Error checking material existence:', error);
      return false;
    }
  }


  /**
   * Test Firebase connection
   * @returns {boolean} Connection status
   */
  static async testFirebaseConnection() {
    try {
      console.log('🔥 [UNIFIED] Testing Firebase connection...');
      const testRef = collection(db, TENDER_ITEMS_COLLECTION);
      await getDocs(query(testRef, where('__test__', '==', 'connection_test')));
      console.log('✅ [UNIFIED] Firebase connection successful');
      return true;
    } catch (error) {
      console.error('❌ [UNIFIED] Firebase connection failed:', error);
      return false;
    }
  }

  /**
   * Validate tender item data
   * @param {Object} itemData - Tender item data
   * @returns {Object} Validation errors
   */
  static validateTenderItemData(itemData) {
    const errors = {};
    
    if (!itemData.tenderId?.trim()) {
      errors.tenderId = 'معرف المناقصة مطلوب';
    }
    
    if (!itemData.materialInternalId?.trim()) {
      errors.materialInternalId = 'معرف المادة مطلوب';
    }
    
    if (!itemData.materialType?.trim()) {
      errors.materialType = 'نوع المادة مطلوب';
    } else if (!['rawMaterial', 'localProduct', 'foreignProduct'].includes(itemData.materialType)) {
      errors.materialType = 'نوع المادة غير صحيح';
    }

    if (!itemData.quantity || parseFloat(itemData.quantity) <= 0) {
      errors.quantity = 'الكمية يجب أن تكون أكبر من صفر';
    }
    
    return errors;
  }
}

export default UnifiedTenderItemsService;