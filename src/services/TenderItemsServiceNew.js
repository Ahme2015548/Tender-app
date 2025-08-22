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

// Helper function to trigger data sync across pages
const triggerDataSync = () => {
  window.dispatchEvent(new CustomEvent('tenderItemsUpdated', {
    detail: { timestamp: Date.now() }
  }));
};

export class TenderItemsServiceNew {
  
  // Get all tender items for a specific tender
  static async getTenderItems(tenderId) {
    try {
      console.log('🔍 Fetching tender items for tender:', tenderId);
      
      const tenderItemsRef = collection(db, TENDER_ITEMS_COLLECTION);
      const q = query(
        tenderItemsRef, 
        where('tenderId', '==', tenderId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      const items = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('TENDER_ITEM'),
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });
      
      console.log('✅ Fetched tender items:', items.length);
      return items;
      
    } catch (error) {
      console.error('❌ Error fetching tender items:', error);
      if (error.code === 'failed-precondition') {
        console.log('⚠️ OrderBy failed, trying simple query...');
        try {
          const tenderItemsRef = collection(db, TENDER_ITEMS_COLLECTION);
          const q = query(tenderItemsRef, where('tenderId', '==', tenderId));
          const querySnapshot = await getDocs(q);
          
          const items = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              internalId: data.internalId || generateId('TENDER_ITEM'),
              ...data,
              createdAt: data.createdAt?.toDate(),
              updatedAt: data.updatedAt?.toDate()
            };
          });
          
          // Manual sort by creation date
          items.sort((a, b) => (b.createdAt || new Date(0)) - (a.createdAt || new Date(0)));
          
          return items;
        } catch (fallbackError) {
          console.error('❌ Fallback query failed:', fallbackError);
          return [];
        }
      }
      throw new Error('فشل في جلب بنود المناقصة');
    }
  }

  // Add material to tender with automatic material lookup
  static async addMaterialToTender(tenderId, materialInternalId, materialType, quantity = 1) {
    try {
      console.log('📝 Adding material to tender:', { tenderId, materialInternalId, materialType, quantity });
      
      // Check for duplicates first
      const existingItems = await this.getTenderItems(tenderId);
      const duplicate = existingItems.find(item => 
        item.materialInternalId === materialInternalId && 
        item.materialType === materialType
      );
      
      if (duplicate) {
        console.log('⚠️ Duplicate material found, updating quantity instead');
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
      console.log('✅ Added tender item with ID:', docRef.id);
      
      triggerDataSync();
      
      // Return the created item with Firebase ID
      return {
        id: docRef.id,
        ...tenderItemDoc,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error('❌ Error adding material to tender:', error);
      throw new Error(`فشل في إضافة المادة للمناقصة: ${error.message}`);
    }
  }

  // Update tender item quantity and recalculate totals
  static async updateTenderItemQuantity(itemId, newQuantity) {
    try {
      console.log('📝 Updating tender item quantity:', { itemId, newQuantity });
      
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
      
      console.log('✅ Updated tender item quantity');
      triggerDataSync();
      
      return {
        ...item,
        quantity: parsedQuantity,
        totalPrice: newTotalPrice,
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error('❌ Error updating tender item quantity:', error);
      throw new Error('فشل في تحديث كمية البند');
    }
  }

  // Get single tender item by ID
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
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching tender item by ID:', error);
      throw new Error('فشل في جلب بيانات البند');
    }
  }

  // Update tender item
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
      console.error('❌ Error updating tender item:', error);
      throw new Error('فشل في تحديث البند');
    }
  }

  // Delete tender item
  static async deleteTenderItem(itemId) {
    try {
      const itemRef = doc(db, TENDER_ITEMS_COLLECTION, itemId);
      await deleteDoc(itemRef);
      
      triggerDataSync();
      return true;
      
    } catch (error) {
      console.error('❌ Error deleting tender item:', error);
      throw new Error('فشل في حذف البند');
    }
  }

  // Delete all items for a tender (when tender is deleted)
  static async deleteAllTenderItems(tenderId) {
    try {
      console.log('🗑️ Deleting all items for tender:', tenderId);
      
      const items = await this.getTenderItems(tenderId);
      
      if (items.length === 0) {
        return true;
      }
      
      // Use batch for better performance
      const batch = writeBatch(db);
      
      items.forEach(item => {
        const itemRef = doc(db, TENDER_ITEMS_COLLECTION, item.id);
        batch.delete(itemRef);
      });
      
      await batch.commit();
      
      console.log('✅ Deleted all tender items:', items.length);
      triggerDataSync();
      
      return true;
      
    } catch (error) {
      console.error('❌ Error deleting all tender items:', error);
      throw new Error('فشل في حذف جميع بنود المناقصة');
    }
  }

  // Refresh prices for all items in a tender
  static async refreshTenderItemsPricing(tenderIdOrItems) {
    try {
      console.log('🔄 Refreshing prices for tender:', tenderIdOrItems);
      
      // Handle both tender ID (string) and array of items
      let items;
      if (Array.isArray(tenderIdOrItems)) {
        console.log('📦 Input is array of items, using directly');
        items = tenderIdOrItems;
      } else {
        console.log('🔍 Input is tender ID, fetching items from database');
        items = await this.getTenderItems(tenderIdOrItems);
      }
      
      if (!items || items.length === 0) {
        console.log('📭 No items to refresh pricing for');
        return [];
      }
      
      const updatedItems = [];
      const batch = writeBatch(db);
      let batchUpdates = 0;
      const isItemsArray = Array.isArray(tenderIdOrItems);
      
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
            const newTotalPrice = (item.quantity || 1) * newUnitPrice;
            
            // Only update database if we're working with database items (not pending items)
            const shouldUpdateDb = !isItemsArray && item.id && (newUnitPrice !== item.unitPrice);
            
            if (shouldUpdateDb) {
              console.log('🔄 Updating database item price:', item.materialName);
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
            }
            
            // Always create updated item object (for both db and pending items)
            updatedItems.push({
              ...item,
              unitPrice: newUnitPrice,
              totalPrice: newTotalPrice,
              supplierInfo: materialDetails.supplier || item.supplierInfo || '',
              materialUnit: materialDetails.unit || item.materialUnit || 'قطعة'
            });
          } else {
            console.warn('⚠️ Material not found for item:', item.materialInternalId);
            updatedItems.push(item);
          }
          
        } catch (itemError) {
          console.error('❌ Error refreshing item:', item.materialName, itemError);
          updatedItems.push(item);
        }
      }
      
      // Commit batch updates
      if (batchUpdates > 0) {
        await batch.commit();
        console.log('✅ Batch updated', batchUpdates, 'items');
      }
      
      triggerDataSync();
      return updatedItems;
      
    } catch (error) {
      console.error('❌ Error refreshing tender items pricing:', error);
      throw new Error('فشل في تحديث أسعار البنود');
    }
  }

  // Bulk add multiple materials to tender
  static async addMultipleMaterialsToTender(tenderId, materials) {
    try {
      console.log('📝 Bulk adding materials to tender:', { tenderId, count: materials.length });
      
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
          console.log('⚠️ Skipping duplicate material:', material.materialInternalId);
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
        console.log('✅ Bulk added items:', addedItems.length);
      }
      
      triggerDataSync();
      return addedItems;
      
    } catch (error) {
      console.error('❌ Error bulk adding materials:', error);
      throw new Error('فشل في إضافة المواد للمناقصة');
    }
  }

  // Check if material exists in tender
  static async materialExistsInTender(tenderId, materialInternalId, materialType) {
    try {
      const items = await this.getTenderItems(tenderId);
      return items.some(item => 
        item.materialInternalId === materialInternalId && 
        item.materialType === materialType
      );
    } catch (error) {
      console.error('❌ Error checking material existence:', error);
      return false;
    }
  }

  // Get tender totals (price and quantity)
  static async getTenderTotals(tenderId) {
    try {
      const items = await this.getTenderItems(tenderId);
      
      const totalPrice = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const itemsCount = items.length;
      
      return {
        totalPrice,
        totalQuantity,
        itemsCount,
        items
      };
      
    } catch (error) {
      console.error('❌ Error calculating tender totals:', error);
      throw new Error('فشل في حساب إجماليات المناقصة');
    }
  }

  // Get all items by material type
  static async getTenderItemsByType(tenderId, materialType) {
    try {
      const tenderItemsRef = collection(db, TENDER_ITEMS_COLLECTION);
      const q = query(
        tenderItemsRef,
        where('tenderId', '==', tenderId),
        where('materialType', '==', materialType),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('TENDER_ITEM'),
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });
      
    } catch (error) {
      console.error('❌ Error fetching items by type:', error);
      // Fallback to filter from all items
      const allItems = await this.getTenderItems(tenderId);
      return allItems.filter(item => item.materialType === materialType);
    }
  }


  // Search tender items
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
      console.error('❌ Error searching tender items:', error);
      throw new Error('فشل في البحث عن البنود');
    }
  }

  // Get materials summary by type
  static async getMaterialsSummary(tenderId) {
    try {
      const items = await this.getTenderItems(tenderId);
      
      const summary = {
        rawMaterial: { count: 0, totalPrice: 0 },
        localProduct: { count: 0, totalPrice: 0 },
        foreignProduct: { count: 0, totalPrice: 0 }
      };
      
      items.forEach(item => {
        const type = item.materialType || 'rawMaterial';
        if (summary[type]) {
          summary[type].count++;
          summary[type].totalPrice += (item.totalPrice || 0);
        }
      });
      
      return summary;
      
    } catch (error) {
      console.error('❌ Error getting materials summary:', error);
      throw new Error('فشل في تجميع بيانات المواد');
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
    }

    if (!itemData.quantity || parseFloat(itemData.quantity) <= 0) {
      errors.quantity = 'الكمية يجب أن تكون أكبر من صفر';
    }
    
    return errors;
  }

  // Get statistics for tender items
  static async getTenderStatistics(tenderId) {
    try {
      const items = await this.getTenderItems(tenderId);
      const summary = await this.getMaterialsSummary(tenderId);
      
      const stats = {
        totalItems: items.length,
        totalValue: items.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
        totalQuantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
        materialTypes: summary,
        averageItemValue: items.length > 0 ? 
          items.reduce((sum, item) => sum + (item.totalPrice || 0), 0) / items.length : 0,
        highestValueItem: items.reduce((max, item) => 
          (item.totalPrice || 0) > (max.totalPrice || 0) ? item : max, {}),
        lowestValueItem: items.reduce((min, item) => 
          (item.totalPrice || 0) < (min.totalPrice || Number.MAX_VALUE) ? item : min, {})
      };
      
      return stats;
      
    } catch (error) {
      console.error('❌ Error getting tender statistics:', error);
      throw new Error('فشل في جلب إحصائيات المناقصة');
    }
  }
}

export default TenderItemsServiceNew;