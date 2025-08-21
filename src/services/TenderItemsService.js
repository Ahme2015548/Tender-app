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
import { db } from './firebase.js';
import { generateId } from '../utils/idGenerator.js';
import { RawMaterialService } from './rawMaterialService.js';
import { LocalProductService } from './localProductService.js';
import { ForeignProductService } from './foreignProductService.js';
import { ManufacturedProductService } from './ManufacturedProductService.js';
import { sessionDataService } from './SessionDataService.js';

const TENDER_ITEMS_COLLECTION = 'tenderItems';

// Helper function to trigger data sync across pages (Firestore real-time)
const triggerDataSync = () => {
  window.dispatchEvent(new CustomEvent('tenderItemsUpdated'));
  // Note: Firestore real-time listeners will handle cross-tab sync automatically
};

export class TenderItemsService {
  
  // Helper method to check for duplicates in sessionDataService
  static async checkForDuplicates(materialInternalId, storageKey = 'pendingTenderItems') {
    try {
      let existingItems;
      if (storageKey === 'pendingTenderItems') {
        existingItems = await sessionDataService.getPendingTenderItems() || [];
      } else {
        existingItems = await sessionDataService.getSessionData(storageKey) || [];
      }
      return existingItems.some(item => item.materialInternalId === materialInternalId);
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return false;
    }
  }
  
  // Helper method to safely add item to sessionDataService with duplicate prevention
  static async addToSessionStorage(item, storageKey = 'pendingTenderItems') {
    try {
      let existingItems;
      if (storageKey === 'pendingTenderItems') {
        existingItems = await sessionDataService.getPendingTenderItems() || [];
      } else {
        existingItems = await sessionDataService.getSessionData(storageKey) || [];
      }
      
      const isDuplicate = existingItems.some(existingItem => 
        existingItem.materialInternalId === item.materialInternalId
      );
      
      if (isDuplicate) {
        throw new Error(`البند ${item.materialName || 'غير معروف'} موجود مسبقاً في القائمة`);
      }
      
      existingItems.push(item);
      
      if (storageKey === 'pendingTenderItems') {
        await sessionDataService.setPendingTenderItems(existingItems);
      } else {
        await sessionDataService.setSessionData(storageKey, existingItems);
      }
      
      console.log(`📦 Item added to ${storageKey}:`, item.materialName);
      return true;
    } catch (error) {
      console.error('Error adding to sessionDataService:', error);
      throw error;
    }
  }

  // Method specifically for manufactured product items with duplicate prevention
  static async createManufacturedProductItem(itemData) {
    try {
      console.log('🏭 Creating manufactured product item:', itemData);
      
      // Check for duplicate before any processing
      if (await this.checkForDuplicates(itemData.materialInternalId, 'pendingProductItems')) {
        throw new Error(`البند موجود مسبقاً في قائمة المنتج المصنع`);
      }
      
      // Use the same logic as regular tender items but different storage
      const tenderItem = await this.createTenderItemSimple(itemData);
      
      // Add to manufactured product storage instead of tender storage
      const productItem = {
        ...tenderItem,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.addToSessionStorage(productItem, 'pendingProductItems');
      console.log('✅ Manufactured product item created successfully');
      
      return productItem;
    } catch (error) {
      console.error('❌ Error creating manufactured product item:', error);
      throw error;
    }
  }
  
  // PURE Firebase methods - EXACTLY like raw materials
  
  static async getAllTenderItems() {
    try {
      const tenderItemsRef = collection(db, TENDER_ITEMS_COLLECTION);
      
      let querySnapshot;
      try {
        const q = query(tenderItemsRef, orderBy('createdAt', 'desc'));
        querySnapshot = await getDocs(q);
      } catch (orderError) {
        console.log('OrderBy failed, using simple query:', orderError.message);
        querySnapshot = await getDocs(tenderItemsRef);
      }
      
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
      console.error('Error fetching tender items:', error);
      throw new Error('فشل في جلب بيانات بنود المناقصة');
    }
  }

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
      console.error('Error fetching tender item by ID:', error);
      throw new Error('فشل في جلب بيانات بند المناقصة');
    }
  }

  static async getTenderItems(tenderId) {
    try {
      const tenderItemsRef = collection(db, TENDER_ITEMS_COLLECTION);
      const q = query(tenderItemsRef, where('tenderId', '==', tenderId));
      
      let querySnapshot;
      try {
        const orderedQuery = query(tenderItemsRef, 
          where('tenderId', '==', tenderId), 
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(orderedQuery);
      } catch (orderError) {
        console.log('OrderBy failed, using simple query:', orderError.message);
        querySnapshot = await getDocs(q);
      }
      
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
      console.error('Error fetching tender items:', error);
      throw new Error('فشل في جلب بيانات بنود المناقصة');
    }
  }

  static async createTenderItem(itemData) {
    try {
      console.log('🔥 Creating tender item in Firebase:', itemData);
      
      // Get material details based on type
      let materialDetails = null;
      
      try {
        switch (itemData.materialType) {
          case 'rawMaterial':
            console.log('📋 Looking up raw material:', itemData.materialInternalId);
            materialDetails = await RawMaterialService.getRawMaterialByInternalId(itemData.materialInternalId);
            break;
          case 'localProduct':
            console.log('📋 Looking up local product:', itemData.materialInternalId);
            materialDetails = await LocalProductService.getLocalProductByInternalId(itemData.materialInternalId);
            break;
          case 'foreignProduct':
            console.log('📋 Looking up foreign product:', itemData.materialInternalId);
            materialDetails = await ForeignProductService.getForeignProductByInternalId(itemData.materialInternalId);
            break;
          case 'manufacturedProduct':
            console.log('📋 Looking up manufactured product:', itemData.materialInternalId);
            materialDetails = await ManufacturedProductService.getManufacturedProductByInternalId(itemData.materialInternalId);
            // Map title to name for consistency
            if (materialDetails && materialDetails.title) {
              materialDetails.name = materialDetails.title;
            }
            break;
          default:
            throw new Error(`Unsupported material type: ${itemData.materialType}`);
        }
      } catch (lookupError) {
        console.error('❌ Material lookup failed:', lookupError);
        throw new Error(`فشل في العثور على المادة: ${itemData.materialName || itemData.materialInternalId}`);
      }
      
      if (!materialDetails) {
        console.error('❌ Material not found with ID:', itemData.materialInternalId);
        throw new Error(`المادة غير موجودة: ${itemData.materialName || itemData.materialInternalId}`);
      }
      
      console.log('✅ Material found:', materialDetails.name);
      
      // Calculate pricing
      const quantity = parseFloat(itemData.quantity) || 1;
      const unitPrice = parseFloat(materialDetails.price) || 0;
      const totalPrice = quantity * unitPrice;
      
      const internalId = generateId('TENDER_ITEM');
      const tenderItemDoc = {
        internalId: internalId,
        tenderId: itemData.tenderId,
        materialInternalId: itemData.materialInternalId,
        materialType: itemData.materialType,
        materialName: materialDetails.name,
        materialCategory: materialDetails.category,
        materialUnit: materialDetails.unit,
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        supplierInfo: materialDetails.supplier || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Save to Firebase as primary storage
      const docRef = await addDoc(collection(db, TENDER_ITEMS_COLLECTION), tenderItemDoc);
      console.log('✅ Tender item saved to Firebase with ID:', docRef.id);
      
      // Also store in SessionDataService for AddTender page access
      const sessionItem = {
        ...tenderItemDoc,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const existingItems = await sessionDataService.getPendingTenderItems() || [];
      existingItems.push(sessionItem);
      await sessionDataService.setPendingTenderItems(existingItems);
      console.log('📦 Tender item backed up to SessionDataService');
      
      triggerDataSync();
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating tender item in Firebase:', error);
      
      // Fallback: Save to SessionDataService only
      console.log('🔄 Firebase failed, saving to SessionDataService only...');
      try {
        const fallbackId = `local_${Date.now()}`;
        const fallbackItem = {
          ...itemData,
          id: fallbackId,
          internalId: generateId('TENDER_ITEM'),
          createdAt: new Date(),
          updatedAt: new Date(),
          isLocal: true
        };
        
        const existingItems = await sessionDataService.getPendingTenderItems() || [];
        existingItems.push(fallbackItem);
        await sessionDataService.setPendingTenderItems(existingItems);
        console.log('📦 Tender item saved to sessionDataService as fallback');
        return fallbackId;
      } catch (fallbackError) {
        console.error('❌ Both Firebase and SessionDataService failed:', fallbackError);
        throw new Error('فشل في إنشاء بند المناقصة');
      }
    }
  }

  // Simple method to create tender item with minimal validation (for emergency use)
  static async createTenderItemSimple(itemData) {
    try {
      console.log('🔄 Creating tender item with simple method:', itemData);
      
      const internalId = generateId('TENDER_ITEM');
      const tenderItemDoc = {
        internalId: internalId,
        tenderId: itemData.tenderId || 'new',
        materialInternalId: itemData.materialInternalId,
        materialType: itemData.materialType || 'rawMaterial',
        materialName: itemData.materialName || 'Unknown Material',
        materialCategory: itemData.materialCategory || '',
        materialUnit: itemData.materialUnit || 'قطعة',
        quantity: parseFloat(itemData.quantity) || 1,
        unitPrice: parseFloat(itemData.unitPrice) || 0,
        totalPrice: (parseFloat(itemData.quantity) || 1) * (parseFloat(itemData.unitPrice) || 0),
        supplierInfo: itemData.supplierInfo || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Save to Firebase
      const docRef = await addDoc(collection(db, TENDER_ITEMS_COLLECTION), tenderItemDoc);
      console.log('✅ Simple tender item saved to Firebase with ID:', docRef.id);
      
      triggerDataSync();
      
      return {
        id: docRef.id,
        ...tenderItemDoc,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('❌ Simple tender item creation failed:', error);
      throw new Error(`فشل في إنشاء بند المناقصة: ${error.message}`);
    }
  }

  static async createTenderItem(itemData) {
    try {
      // Get material details based on type
      let materialDetails = null;
      
      switch (itemData.materialType) {
        case 'rawMaterial':
          materialDetails = await RawMaterialService.getRawMaterialByInternalId(itemData.materialInternalId);
          break;
        case 'localProduct':
          materialDetails = await LocalProductService.getLocalProductByInternalId(itemData.materialInternalId);
          break;
        case 'foreignProduct':
          materialDetails = await ForeignProductService.getForeignProductByInternalId(itemData.materialInternalId);
          break;
        default:
          throw new Error(`Unsupported material type: ${itemData.materialType}`);
      }
      
      if (!materialDetails) {
        throw new Error(`Material not found: ${itemData.materialInternalId}`);
      }
      
      // Calculate pricing
      const quantity = parseFloat(itemData.quantity) || 1;
      const unitPrice = parseFloat(materialDetails.price) || 0;
      const totalPrice = quantity * unitPrice;
      
      const internalId = generateId('TENDER_ITEM');
      const tenderItemDoc = {
        internalId: internalId,
        tenderId: itemData.tenderId,
        materialInternalId: itemData.materialInternalId,
        materialType: itemData.materialType,
        materialName: materialDetails.name,
        materialCategory: materialDetails.category,
        materialUnit: materialDetails.unit,
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        supplierInfo: materialDetails.supplier || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, TENDER_ITEMS_COLLECTION), tenderItemDoc);
      
      triggerDataSync();
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating tender item:', error);
      throw new Error('فشل في إنشاء بند المناقصة');
    }
  }

  static async updateTenderItem(itemId, itemData) {
    try {
      const itemRef = doc(db, TENDER_ITEMS_COLLECTION, itemId);
      const updateData = {
        ...itemData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(itemRef, updateData);
      
      triggerDataSync();
      
      return true;
    } catch (error) {
      console.error('Error updating tender item:', error);
      throw new Error('فشل في تحديث بند المناقصة');
    }
  }

  static async deleteTenderItem(itemId) {
    try {
      const itemRef = doc(db, TENDER_ITEMS_COLLECTION, itemId);
      await deleteDoc(itemRef);
      
      triggerDataSync();
      
      return true;
    } catch (error) {
      console.error('Error deleting tender item:', error);
      throw new Error('فشل في حذف بند المناقصة');
    }
  }

  // Simple helper methods
  static async addMaterialToTender(tenderId, materialInternalId, materialType, quantity = 1) {
    try {
      // Check if item already exists to prevent duplicates
      const existingItems = await this.getTenderItems(tenderId);
      const existingItem = existingItems.find(item => 
        item.materialInternalId === materialInternalId && 
        item.materialType === materialType
      );
      
      if (existingItem) {
        console.log('⚠️ Item already exists in tender, skipping duplicate creation');
        return existingItem;
      }
      
      const itemId = await this.createTenderItem({
        tenderId: tenderId,
        materialInternalId: materialInternalId,
        materialType: materialType,
        quantity: quantity
      });
      
      return await this.getTenderItemById(itemId);
      
    } catch (error) {
      console.error('Error adding material to tender:', error);
      throw new Error('فشل في إضافة المادة للمناقصة');
    }
  }

  // Helper method to check if material exists in tender
  static async materialExistsInTender(tenderId, materialInternalId, materialType) {
    try {
      const items = await this.getTenderItems(tenderId);
      return items.some(item => 
        item.materialInternalId === materialInternalId && 
        item.materialType === materialType
      );
    } catch (error) {
      console.error('Error checking material existence:', error);
      return false;
    }
  }

  static async refreshTenderItemsPricing(tenderIdOrItems) {
    try {
      // Handle both tenderId (string) and items array
      let currentItems;
      if (typeof tenderIdOrItems === 'string') {
        // Called with tenderId - fetch from Firebase
        currentItems = await this.getTenderItems(tenderIdOrItems);
      } else if (Array.isArray(tenderIdOrItems)) {
        // Called with items array directly (from SessionDataService)
        currentItems = tenderIdOrItems;
      } else {
        console.warn('Invalid parameter for refreshTenderItemsPricing:', tenderIdOrItems);
        return [];
      }
      
      if (currentItems.length === 0) {
        return [];
      }
      
      const updatedItems = [];
      
      for (const item of currentItems) {
        try {
          // Get latest material details
          let materialDetails = null;
          
          const materialType = item.materialType || item.type || 'rawMaterial';
          switch (materialType) {
            case 'rawMaterial':
              materialDetails = await RawMaterialService.getRawMaterialByInternalId(item.materialInternalId);
              break;
            case 'localProduct':
              materialDetails = await LocalProductService.getLocalProductByInternalId(item.materialInternalId);
              break;
            case 'foreignProduct':
              materialDetails = await ForeignProductService.getForeignProductByInternalId(item.materialInternalId);
              break;
            case 'manufacturedProduct':
              materialDetails = await ManufacturedProductService.getManufacturedProductByInternalId(item.materialInternalId);
              break;
          }
          
          if (materialDetails) {
            const newUnitPrice = parseFloat(materialDetails.price) || 0;
            const newTotalPrice = item.quantity * newUnitPrice;
            
            // Update if price changed
            if (newUnitPrice !== item.unitPrice) {
              await this.updateTenderItem(item.id, {
                unitPrice: newUnitPrice,
                totalPrice: newTotalPrice,
                supplierInfo: materialDetails.supplier || ''
              });
              
              updatedItems.push({
                ...item,
                unitPrice: newUnitPrice,
                totalPrice: newTotalPrice,
                supplierInfo: materialDetails.supplier || ''
              });
            } else {
              updatedItems.push(item);
            }
          } else {
            updatedItems.push(item);
          }
          
        } catch (itemError) {
          console.error('Error refreshing individual item:', itemError);
          updatedItems.push(item);
        }
      }
      
      return updatedItems;
      
    } catch (error) {
      console.error('Error refreshing tender items pricing:', error);
      throw new Error('فشل في تحديث أسعار بنود المناقصة');
    }
  }

  // Add missing method to delete all tender items for a tender
  static async deleteAllTenderItems(tenderId) {
    try {
      const items = await this.getTenderItems(tenderId);
      
      for (const item of items) {
        await this.deleteTenderItem(item.id);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting all tender items:', error);
      throw new Error('فشل في حذف جميع بنود المناقصة');
    }
  }

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
}

export default TenderItemsService;