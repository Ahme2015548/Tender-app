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

// Data sync trigger for real-time updates
const triggerDataSync = () => {
  window.dispatchEvent(new CustomEvent('tenderItemsUpdated', {
    detail: { timestamp: Date.now() }
  }));
};

export class TenderItemsFirebaseService {
  
  // Get all tender items for a specific tender (Firebase only)
  static async getTenderItems(tenderId) {
    try {
      console.log('🔥 [FB-ONLY] Fetching tender items for tender:', tenderId);
      
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
        // Fallback to simple query if orderBy fails (missing index)
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
      
      console.log('✅ [FB-ONLY] Fetched tender items:', items.length);
      return items;
      
    } catch (error) {
      console.error('❌ [FB-ONLY] Error fetching tender items:', error);
      throw new Error(`فشل في جلب بنود المناقصة: ${error.message}`);
    }
  }

  // Add material to tender (Firebase only)
  static async addMaterialToTender(tenderId, materialInternalId, materialType, quantity = 1) {
    try {
      console.log('🔥 [FB-ONLY] Adding material to tender:', { 
        tenderId, materialInternalId, materialType, quantity 
      });
      
      // Check for duplicates
      const existingItems = await this.getTenderItems(tenderId);
      const duplicate = existingItems.find(item => 
        item.materialInternalId === materialInternalId && 
        item.materialType === materialType
      );
      
      if (duplicate) {
        console.log('⚠️ [FB-ONLY] Duplicate found, updating quantity');
        const newQuantity = (duplicate.quantity || 1) + quantity;
        return await this.updateTenderItemQuantity(duplicate.id, newQuantity);
      }
      
      // Get material details
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
      const unitPrice = parseFloat(materialDetails.price) || 0;
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
        supplierInfo: {
          name: materialDetails.supplier || '',
          id: materialDetails.supplierId || ''
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, TENDER_ITEMS_COLLECTION), tenderItemDoc);
      console.log('✅ [FB-ONLY] Added tender item with ID:', docRef.id);
      
      triggerDataSync();
      
      return {
        id: docRef.id,
        ...tenderItemDoc,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error('❌ [FB-ONLY] Error adding material to tender:', error);
      throw new Error(`فشل في إضافة المادة للمناقصة: ${error.message}`);
    }
  }

  // Update tender item quantity (Firebase only)
  static async updateTenderItemQuantity(itemId, newQuantity) {
    try {
      console.log('🔥 [FB-ONLY] Updating item quantity:', { itemId, newQuantity });
      
      const item = await this.getTenderItemById(itemId);
      if (!item) {
        throw new Error('البند غير موجود');
      }
      
      const parsedQuantity = parseFloat(newQuantity) || 1;
      const newTotalPrice = parsedQuantity * (item.unitPrice || 0);
      
      const itemRef = doc(db, TENDER_ITEMS_COLLECTION, itemId);
      await updateDoc(itemRef, {
        quantity: parsedQuantity,
        totalPrice: newTotalPrice,
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ [FB-ONLY] Updated tender item quantity');
      triggerDataSync();
      
      return {
        ...item,
        quantity: parsedQuantity,
        totalPrice: newTotalPrice,
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error('❌ [FB-ONLY] Error updating quantity:', error);
      throw new Error(`فشل في تحديث كمية البند: ${error.message}`);
    }
  }

  // Get single tender item by ID (Firebase only)
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
      console.error('❌ [FB-ONLY] Error fetching tender item by ID:', error);
      throw new Error(`فشل في جلب بيانات البند: ${error.message}`);
    }
  }

  // Update tender item (Firebase only)
  static async updateTenderItem(itemId, updateData) {
    try {
      const itemRef = doc(db, TENDER_ITEMS_COLLECTION, itemId);
      await updateDoc(itemRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      
      triggerDataSync();
      return true;
      
    } catch (error) {
      console.error('❌ [FB-ONLY] Error updating tender item:', error);
      throw new Error(`فشل في تحديث البند: ${error.message}`);
    }
  }

  // Delete tender item (Firebase only)
  static async deleteTenderItem(itemId) {
    try {
      const itemRef = doc(db, TENDER_ITEMS_COLLECTION, itemId);
      await deleteDoc(itemRef);
      
      triggerDataSync();
      return true;
      
    } catch (error) {
      console.error('❌ [FB-ONLY] Error deleting tender item:', error);
      throw new Error(`فشل في حذف البند: ${error.message}`);
    }
  }

  // Delete all items for a tender (Firebase only)
  static async deleteAllTenderItems(tenderId) {
    try {
      console.log('🔥 [FB-ONLY] Deleting all items for tender:', tenderId);
      
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
      
      console.log('✅ [FB-ONLY] Deleted all tender items:', items.length);
      triggerDataSync();
      
      return true;
      
    } catch (error) {
      console.error('❌ [FB-ONLY] Error deleting all tender items:', error);
      throw new Error(`فشل في حذف جميع بنود المناقصة: ${error.message}`);
    }
  }

  // Refresh prices for all items in a tender (Firebase only)
  static async refreshTenderItemsPricing(tenderId) {
    try {
      console.log('🔥 [FB-ONLY] Refreshing prices for tender:', tenderId);
      
      const items = await this.getTenderItems(tenderId);
      
      if (items.length === 0) {
        return [];
      }
      
      const updatedItems = [];
      const batch = writeBatch(db);
      let batchUpdates = 0;
      
      for (const item of items) {
        try {
          // Get latest material details
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
            const newUnitPrice = parseFloat(materialDetails.price) || 0;
            const newTotalPrice = item.quantity * newUnitPrice;
            
            // Update if price changed
            if (newUnitPrice !== item.unitPrice) {
              const itemRef = doc(db, TENDER_ITEMS_COLLECTION, item.id);
              batch.update(itemRef, {
                unitPrice: newUnitPrice,
                totalPrice: newTotalPrice,
                supplierInfo: {
                  name: materialDetails.supplier || '',
                  id: materialDetails.supplierId || ''
                },
                updatedAt: serverTimestamp()
              });
              batchUpdates++;
              
              updatedItems.push({
                ...item,
                unitPrice: newUnitPrice,
                totalPrice: newTotalPrice,
                supplierInfo: {
                  name: materialDetails.supplier || '',
                  id: materialDetails.supplierId || ''
                }
              });
            } else {
              updatedItems.push(item);
            }
          } else {
            console.warn('⚠️ [FB-ONLY] Material not found:', item.materialInternalId);
            updatedItems.push(item);
          }
          
        } catch (itemError) {
          console.error('❌ [FB-ONLY] Error refreshing item:', item.materialName, itemError);
          updatedItems.push(item);
        }
      }
      
      // Commit batch updates
      if (batchUpdates > 0) {
        await batch.commit();
        console.log('✅ [FB-ONLY] Batch updated', batchUpdates, 'items');
      }
      
      triggerDataSync();
      return updatedItems;
      
    } catch (error) {
      console.error('❌ [FB-ONLY] Error refreshing tender items pricing:', error);
      throw new Error(`فشل في تحديث أسعار البنود: ${error.message}`);
    }
  }

  // Bulk add multiple materials to tender (Firebase only)
  static async addMultipleMaterialsToTender(tenderId, materials) {
    try {
      console.log('🔥 [FB-ONLY] Bulk adding materials:', { tenderId, count: materials.length });
      
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
          console.log('⚠️ [FB-ONLY] Skipping duplicate:', material.materialInternalId);
          continue;
        }
        
        // Get material details
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
          const unitPrice = parseFloat(materialDetails.price) || 0;
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
            supplierInfo: {
              name: materialDetails.supplier || '',
              id: materialDetails.supplierId || ''
            },
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
        console.log('✅ [FB-ONLY] Bulk added items:', addedItems.length);
      }
      
      triggerDataSync();
      return addedItems;
      
    } catch (error) {
      console.error('❌ [FB-ONLY] Error bulk adding materials:', error);
      throw new Error(`فشل في إضافة المواد للمناقصة: ${error.message}`);
    }
  }

  // Check if material exists in tender (Firebase only)
  static async materialExistsInTender(tenderId, materialInternalId, materialType) {
    try {
      const items = await this.getTenderItems(tenderId);
      return items.some(item => 
        item.materialInternalId === materialInternalId && 
        item.materialType === materialType
      );
    } catch (error) {
      console.error('❌ [FB-ONLY] Error checking material existence:', error);
      return false;
    }
  }

  // Get tender totals (Firebase only)
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
      console.error('❌ [FB-ONLY] Error calculating tender totals:', error);
      throw new Error(`فشل في حساب إجماليات المناقصة: ${error.message}`);
    }
  }

  // Search tender items (Firebase only)
  static async searchTenderItems(tenderId, searchTerm) {
    try {
      const allItems = await this.getTenderItems(tenderId);
      
      if (!searchTerm.trim()) {
        return allItems;
      }
      
      const searchLower = searchTerm.toLowerCase();
      
      return allItems.filter(item => 
        (item.materialName || '').toLowerCase().includes(searchLower) ||
        (item.materialCategory || '').toLowerCase().includes(searchLower) ||
        (item.supplierInfo?.name || '').toLowerCase().includes(searchLower) ||
        (item.materialType || '').toLowerCase().includes(searchLower)
      );
      
    } catch (error) {
      console.error('❌ [FB-ONLY] Error searching tender items:', error);
      throw new Error(`فشل في البحث عن البنود: ${error.message}`);
    }
  }

  // Get materials summary by type (Firebase only)
  static async getMaterialsSummary(tenderId) {
    try {
      const items = await this.getTenderItems(tenderId);
      
      const summary = {
        rawMaterial: { 
          count: 0, 
          totalPrice: 0, 
          items: [] 
        },
        localProduct: { 
          count: 0, 
          totalPrice: 0, 
          items: [] 
        },
        foreignProduct: { 
          count: 0, 
          totalPrice: 0, 
          items: [] 
        }
      };
      
      items.forEach(item => {
        const type = item.materialType || 'rawMaterial';
        if (summary[type]) {
          summary[type].count++;
          summary[type].totalPrice += (item.totalPrice || 0);
          summary[type].items.push(item);
        }
      });
      
      return summary;
      
    } catch (error) {
      console.error('❌ [FB-ONLY] Error getting materials summary:', error);
      throw new Error(`فشل في تجميع بيانات المواد: ${error.message}`);
    }
  }

  // Validate tender item data
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

  // Test Firebase connection
  static async testConnection() {
    try {
      console.log('🔥 [FB-ONLY] Testing Firebase connection...');
      const testRef = collection(db, TENDER_ITEMS_COLLECTION);
      await getDocs(query(testRef, where('__test__', '==', 'connection_test')));
      console.log('✅ [FB-ONLY] Firebase connection successful');
      return true;
    } catch (error) {
      console.error('❌ [FB-ONLY] Firebase connection failed:', error);
      return false;
    }
  }
}

export default TenderItemsFirebaseService;