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
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from './firebase.js';
import { generateId, generateUUID, ENTITY_PREFIXES } from '../utils/idGenerator.js';

const LOCAL_PRODUCTS_COLLECTION = 'localproducts';

// Helper function to trigger data sync across pages
const triggerDataSync = () => {
  localStorage.setItem('localProducts_updated', Date.now().toString());
  // Trigger custom event for same-page components
  window.dispatchEvent(new CustomEvent('localProductsUpdated'));
};

export class LocalProductService {
  
  static async getAllLocalProducts() {
    try {
      const localProductsRef = collection(db, LOCAL_PRODUCTS_COLLECTION);
      
      // Try to get all documents first, then order if there are any
      let q;
      try {
        q = query(localProductsRef, orderBy('createdAt', 'desc'));
      } catch (orderError) {
        console.log('Using query without orderBy for empty collection');
        q = query(localProductsRef);
      }
      
      const querySnapshot = await getDocs(q);
      
      const docs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('LOCAL_PRODUCT'), // Generate proper internal ID if missing
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
      console.error('Error fetching local products:', error);
      console.error('Error details:', error.code, error.message);
      
      // If it's a missing index error, return empty array
      if (error.code === 'failed-precondition' || error.message.includes('index')) {
        console.log('Collection appears to be empty or missing index, returning empty array');
        return [];
      }
      
      throw new Error('فشل في جلب بيانات المنتجات المحلية: ' + error.message);
    }
  }

  static async getLocalProductById(localProductId) {
    try {
      const localProductRef = doc(db, LOCAL_PRODUCTS_COLLECTION, localProductId);
      const docSnap = await getDoc(localProductRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          internalId: data.internalId || generateId('LOCAL_PRODUCT'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching local product by ID:', error);
      throw new Error('فشل في جلب بيانات المنتج المحلي');
    }
  }

  static async createLocalProduct(localProductData) {
    try {
      const internalId = generateId('LOCAL_PRODUCT');
      const localProductDoc = {
        ...localProductData,
        internalId: internalId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, LOCAL_PRODUCTS_COLLECTION), localProductDoc);
      
      // Trigger data sync across pages
      triggerDataSync();
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating local product:', error);
      throw new Error('فشل في إنشاء المنتج المحلي');
    }
  }

  static async updateLocalProduct(localProductId, localProductData) {
    try {
      const localProductRef = doc(db, LOCAL_PRODUCTS_COLLECTION, localProductId);
      const updateData = {
        ...localProductData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(localProductRef, updateData);
      
      // Trigger data sync across pages
      triggerDataSync();
      
      return true;
    } catch (error) {
      console.error('Error updating local product:', error);
      throw new Error('فشل في تحديث بيانات المنتج المحلي');
    }
  }

  static async getLocalProductByInternalId(internalId) {
    try {
      const localProductsRef = collection(db, LOCAL_PRODUCTS_COLLECTION);
      const q = query(localProductsRef, where('internalId', '==', internalId));
      const querySnapshot = await getDocs(q);
      
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
      console.error('Error fetching local product by internal ID:', error);
      throw new Error('فشل في جلب بيانات المنتج المحلي');
    }
  }

  static async updateLocalProductByInternalId(internalId, localProductData) {
    try {
      const localProduct = await this.getLocalProductByInternalId(internalId);
      if (!localProduct) {
        throw new Error('Local product not found');
      }
      
      return await this.updateLocalProduct(localProduct.id, localProductData);
    } catch (error) {
      console.error('Error updating local product by internal ID:', error);
      throw new Error('فشل في تحديث بيانات المنتج المحلي');
    }
  }

  static async deleteLocalProduct(localProductId) {
    try {
      const localProductRef = doc(db, LOCAL_PRODUCTS_COLLECTION, localProductId);
      await deleteDoc(localProductRef);
      
      // Trigger data sync across pages
      triggerDataSync();
      
      return true;
    } catch (error) {
      console.error('Error deleting local product:', error);
      throw new Error('فشل في حذف المنتج المحلي');
    }
  }

  static async deleteLocalProductByInternalId(internalId) {
    try {
      const localProduct = await this.getLocalProductByInternalId(internalId);
      if (!localProduct) {
        throw new Error('Local product not found');
      }
      
      return await this.deleteLocalProduct(localProduct.id);
    } catch (error) {
      console.error('Error deleting local product by internal ID:', error);
      throw new Error('فشل في حذف المنتج المحلي');
    }
  }

  static async searchLocalProducts(searchTerm) {
    try {
      const localProductsRef = collection(db, LOCAL_PRODUCTS_COLLECTION);
      const querySnapshot = await getDocs(localProductsRef);
      
      const allLocalProducts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('LOCAL_PRODUCT'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });

      // Client-side filtering for Arabic/English names
      const filteredLocalProducts = allLocalProducts.filter(localProduct => 
        localProduct.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        localProduct.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        localProduct.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        localProduct.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return filteredLocalProducts;
    } catch (error) {
      console.error('Error searching local products:', error);
      console.error('Error details:', error.code, error.message);
      
      // If it's a missing collection error, return empty array
      if (error.code === 'failed-precondition' || error.message.includes('index') || error.code === 'not-found') {
        console.log('Collection appears to be empty or missing, returning empty array');
        return [];
      }
      
      throw new Error('فشل في البحث عن المنتجات المحلية: ' + error.message);
    }
  }

  // Data migration function
  static async migrateExistingData() {
    try {
      console.log('Starting local products migration...');
      const localProducts = await this.getAllLocalProducts();
      let migratedCount = 0;
      
      for (const product of localProducts) {
        // Check if internalId is missing or using old format
        if (!product.internalId || !product.internalId.startsWith('lp_')) {
          const newInternalId = generateId('LOCAL_PRODUCT');
          await this.updateLocalProduct(product.id, {
            ...product,
            internalId: newInternalId
          });
          migratedCount++;
          console.log(`Migrated local product: ${product.name} -> ${newInternalId}`);
        }
      }
      
      console.log(`Migration completed. ${migratedCount} local products migrated.`);
      return { success: true, migratedCount };
    } catch (error) {
      console.error('Error during migration:', error);
      throw new Error('فشل في ترحيل البيانات');
    }
  }

  static validateLocalProductData(localProductData) {
    const errors = {};
    
    if (!localProductData.name?.trim()) {
      errors.name = 'اسم المنتج المحلي مطلوب';
    }
    
    if (!localProductData.category?.trim()) {
      errors.category = 'فئة المنتج المحلي مطلوبة';
    }
    
    if (!localProductData.unit?.trim()) {
      errors.unit = 'الوحدة مطلوبة';
    }

    if (!localProductData.price || parseFloat(localProductData.price) <= 0) {
      errors.price = 'السعر يجب أن يكون أكبر من صفر';
    }
    
    return errors;
  }
}