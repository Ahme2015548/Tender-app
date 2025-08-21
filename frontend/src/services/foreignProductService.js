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
import { createWithId, readById } from './idService.js';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from './firebase.js';
import { generateId, generateUUID, ENTITY_PREFIXES } from '../utils/idGenerator.js';

const FOREIGN_PRODUCTS_COLLECTION = 'foreignproducts';

// Helper function to trigger data sync across pages (Firestore real-time)
const triggerDataSync = () => {
  // Trigger custom event for same-page components
  window.dispatchEvent(new CustomEvent('foreignProductsUpdated'));
  // Note: Firestore real-time listeners will handle cross-tab sync automatically
};

export class ForeignProductService {
  
  static async getAllForeignProducts() {
    try {
      const foreignProductsRef = collection(db, FOREIGN_PRODUCTS_COLLECTION);
      
      // Try with orderBy first, fallback to simple query if needed
      let querySnapshot;
      try {
        const q = query(foreignProductsRef, orderBy('createdAt', 'desc'));
        querySnapshot = await getDocs(q, 'getAllForeignProducts');
      } catch (orderError) {
        console.log('OrderBy failed, using simple query:', orderError.message);
        querySnapshot = await getDocs(foreignProductsRef, 'getAllForeignProducts-simple');
      }
      
      const docs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('FOREIGN_PRODUCT'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });
      
      // Sort manually if orderBy failed
      if (docs.length > 0 && docs[0].createdAt) {
        docs.sort((a, b) => (b.createdAt || new Date(0)) - (a.createdAt || new Date(0)));
      }
      
      return docs;
    } catch (error) {
      console.error('Error fetching foreign products:', error);
      console.error('Error details:', error.code, error.message);
      
      // If it's a missing index error, return empty array
      if (error.code === 'failed-precondition' || error.message.includes('index')) {
        console.log('Collection appears to be empty or missing index, returning empty array');
        return [];
      }
      
      throw new Error('فشل في جلب بيانات المنتجات المستوردة: ' + error.message);
    }
  }

  static async getForeignProductById(foreignProductId) {
    try {
      const data = await readById(FOREIGN_PRODUCTS_COLLECTION, foreignProductId);
      if (!data) return null;
      
      return {
        ...data,
        internalId: data.internalId || generateId('FOREIGN_PRODUCT'),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      };
    } catch (error) {
      console.error('Error fetching foreign product by ID:', error);
      throw new Error('فشل في جلب بيانات المنتج المستورد');
    }
  }

  static async addForeignProduct(foreignProductData) {
    try {
      const internalId = generateId('FOREIGN_PRODUCT');
      
      // Calculate the lowest price from price quotes if available
      let lowestPrice = null;
      if (foreignProductData.priceQuotes && foreignProductData.priceQuotes.length > 0) {
        const prices = foreignProductData.priceQuotes.map(quote => parseFloat(quote.price)).filter(price => !isNaN(price));
        if (prices.length > 0) {
          lowestPrice = Math.min(...prices);
        }
      }
      
      const foreignProductDoc = {
        ...foreignProductData,
        internalId: internalId,
        price: lowestPrice !== null ? lowestPrice.toString() : (foreignProductData.price || ''),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docId = await createWithId(FOREIGN_PRODUCTS_COLLECTION, foreignProductDoc);
      
      // Trigger data sync across pages
      triggerDataSync();
      
      return docId;
    } catch (error) {
      console.error('Error adding foreign product:', error);
      throw new Error('فشل في إضافة المنتج المستورد');
    }
  }

  static async createForeignProduct(foreignProductData) {
    // Alias for addForeignProduct to maintain compatibility
    return this.addForeignProduct(foreignProductData);
  }

  static async updateForeignProduct(foreignProductId, foreignProductData) {
    try {
      // Calculate the lowest price from price quotes if available
      let lowestPrice = null;
      if (foreignProductData.priceQuotes && foreignProductData.priceQuotes.length > 0) {
        const prices = foreignProductData.priceQuotes.map(quote => parseFloat(quote.price)).filter(price => !isNaN(price));
        if (prices.length > 0) {
          lowestPrice = Math.min(...prices);
        }
      }
      
      const foreignProductRef = doc(db, FOREIGN_PRODUCTS_COLLECTION, foreignProductId);
      const updateData = {
        ...foreignProductData,
        price: lowestPrice !== null ? lowestPrice.toString() : (foreignProductData.price || ''),
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(foreignProductRef, updateData, 'updateForeignProduct');
      
      // Trigger data sync across pages
      triggerDataSync();
      
      return true;
    } catch (error) {
      console.error('Error updating foreign product:', error);
      throw new Error('فشل في تحديث بيانات المنتج المستورد');
    }
  }

  static async getForeignProductByInternalId(internalId) {
    try {
      const foreignProductsRef = collection(db, FOREIGN_PRODUCTS_COLLECTION);
      const q = query(foreignProductsRef, where('internalId', '==', internalId));
      const querySnapshot = await getDocs(q, 'getForeignProductByInternalId');
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching foreign product by internal ID:', error);
      throw new Error('فشل في جلب بيانات المنتج المستورد');
    }
  }

  static async updateForeignProductByInternalId(internalId, foreignProductData) {
    try {
      const foreignProduct = await this.getForeignProductByInternalId(internalId);
      if (!foreignProduct) {
        throw new Error('Foreign product not found');
      }
      
      return await this.updateForeignProduct(foreignProduct.id, foreignProductData);
    } catch (error) {
      console.error('Error updating foreign product by internal ID:', error);
      throw new Error('فشل في تحديث بيانات المنتج المستورد');
    }
  }

  static async deleteForeignProduct(foreignProductId) {
    try {
      const foreignProductRef = doc(db, FOREIGN_PRODUCTS_COLLECTION, foreignProductId);
      await deleteDoc(foreignProductRef, 'deleteForeignProduct');
      
      // Trigger data sync across pages
      triggerDataSync();
      
      return true;
    } catch (error) {
      console.error('Error deleting foreign product:', error);
      throw new Error('فشل في حذف المنتج المستورد');
    }
  }

  static async deleteForeignProductByInternalId(internalId) {
    try {
      const foreignProduct = await this.getForeignProductByInternalId(internalId);
      if (!foreignProduct) {
        throw new Error('Foreign product not found');
      }
      
      return await this.deleteForeignProduct(foreignProduct.id);
    } catch (error) {
      console.error('Error deleting foreign product by internal ID:', error);
      throw new Error('فشل في حذف المنتج المستورد');
    }
  }

  static async searchForeignProducts(searchTerm) {
    try {
      const foreignProductsRef = collection(db, FOREIGN_PRODUCTS_COLLECTION);
      const querySnapshot = await getDocs(foreignProductsRef, 'searchForeignProducts');
      
      const allForeignProducts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('FOREIGN_PRODUCT'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });

      // Client-side filtering for Arabic/English names
      const filteredForeignProducts = allForeignProducts.filter(foreignProduct => 
        foreignProduct.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        foreignProduct.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        foreignProduct.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        foreignProduct.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return filteredForeignProducts;
    } catch (error) {
      console.error('Error searching foreign products:', error);
      console.error('Error details:', error.code, error.message);
      
      // If it's a missing collection error, return empty array
      if (error.code === 'failed-precondition' || error.message.includes('index') || error.code === 'not-found') {
        console.log('Collection appears to be empty or missing, returning empty array');
        return [];
      }
      
      throw new Error('فشل في البحث عن المنتجات المستوردة: ' + error.message);
    }
  }

  // Data migration function
  static async migrateExistingData() {
    try {
      console.log('Starting foreign products migration...');
      const foreignProducts = await this.getAllForeignProducts();
      let migratedCount = 0;
      
      for (const product of foreignProducts) {
        // Check if internalId is missing or using old format
        if (!product.internalId || !product.internalId.startsWith('fp_')) {
          const newInternalId = generateId('FOREIGN_PRODUCT');
          await this.updateForeignProduct(product.id, {
            ...product,
            internalId: newInternalId
          });
          migratedCount++;
          console.log(`Migrated foreign product: ${product.name} -> ${newInternalId}`);
        }
      }
      
      console.log(`Migration completed. ${migratedCount} foreign products migrated.`);
      return { success: true, migratedCount };
    } catch (error) {
      console.error('Error during migration:', error);
      throw new Error('فشل في ترحيل البيانات');
    }
  }

  static validateForeignProductData(foreignProductData) {
    const errors = {};
    
    if (!foreignProductData.name?.trim()) {
      errors.name = 'اسم المنتج المستورد مطلوب';
    }
    
    if (!foreignProductData.category?.trim()) {
      errors.category = 'فئة المنتج المستورد مطلوبة';
    }
    
    if (!foreignProductData.unit?.trim()) {
      errors.unit = 'الوحدة مطلوبة';
    }

    if (!foreignProductData.price || parseFloat(foreignProductData.price) <= 0) {
      errors.price = 'السعر يجب أن يكون أكبر من صفر';
    }
    
    return errors;
  }
}