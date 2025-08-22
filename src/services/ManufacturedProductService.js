import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  query, 
  orderBy, 
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from './firebase.js';
import { generateId } from '../utils/idGenerator.js';

// Helper function to trigger data sync across pages
const triggerDataSync = () => {
  // Firestore real-time listeners handle data sync automatically
  // Trigger custom event for same-page components
  window.dispatchEvent(new CustomEvent('manufacturedProductsUpdated'));
};

/**
 * Manufactured Product Service
 * Handles CRUD operations for manufactured products with Firebase integration
 * Pattern matches TenderService for consistency
 */
export class ManufacturedProductService {
  static COLLECTION_NAME = 'manufacturedProducts';
  
  /**
   * Create a new manufactured product
   */
  static async createManufacturedProduct(productData) {
    try {
      console.log('📤 Creating manufactured product:', productData.title);
      
      const internalId = generateId('MANUFACTURED_PRODUCT');
      const dataToSave = {
        ...productData,
        internalId: internalId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: productData.status || 'active'
      };
      
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), dataToSave);
      
      console.log('✅ Manufactured product created with ID:', docRef.id);
      
      return {
        id: docRef.id,
        internalId: internalId,
        ...dataToSave,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error creating manufactured product:', error);
      throw new Error(`فشل في إنشاء المنتج المصنع: ${error.message}`);
    }
  }

  /**
   * Get all manufactured products
   */
  static async getAllManufacturedProducts() {
    try {
      console.log('📋 Loading all manufactured products...');
      
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const products = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        products.push({
          id: doc.id,
          internalId: data.internalId || generateId('MANUFACTURED_PRODUCT'), // Generate if missing
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });

      console.log('✅ Loaded manufactured products:', products.length);
      return products;
    } catch (error) {
      console.error('❌ Error loading manufactured products:', error);
      throw new Error(`فشل في تحميل المنتج المصنعة: ${error.message}`);
    }
  }

  /**
   * Get manufactured product by ID
   */
  static async getManufacturedProductById(productId) {
    try {
      console.log('📋 Loading manufactured product:', productId);
      
      const docRef = doc(db, this.COLLECTION_NAME, productId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('المنتج المصنع غير موجود');
      }

      const data = docSnap.data();
      const product = {
        id: docSnap.id,
        internalId: data.internalId || generateId('MANUFACTURED_PRODUCT'), // Generate if missing
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      };

      console.log('✅ Loaded manufactured product:', product.title);
      return product;
    } catch (error) {
      console.error('❌ Error loading manufactured product:', error);
      throw new Error(`فشل في تحميل المنتج المصنع: ${error.message}`);
    }
  }

  /**
   * Get manufactured product by internal ID
   */
  static async getManufacturedProductByInternalId(internalId) {
    try {
      console.log('📋 Loading manufactured product by internal ID:', internalId);
      
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('internalId', '==', internalId)
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error(`المنتج المصنع غير موجود: ${internalId}`);
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      const product = {
        id: doc.id,
        internalId: data.internalId || internalId,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      };

      // Calculate pricing from items if available
      if (product.items && Array.isArray(product.items) && product.items.length > 0) {
        const calculatedPrice = product.items.reduce((sum, item) => {
          return sum + (item.totalPrice || 0);
        }, 0);
        product.price = calculatedPrice;
      } else {
        product.price = product.estimatedValue || 0;
      }

      // Set standard fields for consistency
      product.name = product.title;
      product.category = 'منتج مصنع';
      product.unit = 'قطعة';
      product.supplier = 'منتج مصنع';

      console.log('✅ Loaded manufactured product by internal ID:', product.title);
      return product;
    } catch (error) {
      console.error('❌ Error loading manufactured product by internal ID:', error);
      throw new Error(`فشل في تحميل المنتج المصنع: ${error.message}`);
    }
  }

  /**
   * Update manufactured product
   */
  static async updateManufacturedProduct(productId, updateData) {
    try {
      console.log('📝 Updating manufactured product:', productId);
      
      const docRef = doc(db, this.COLLECTION_NAME, productId);
      const dataToUpdate = {
        ...updateData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, dataToUpdate);
      
      // Trigger data sync across pages
      triggerDataSync();
      
      console.log('✅ Manufactured product updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating manufactured product:', error);
      throw new Error(`فشل في تحديث المنتج المصنع: ${error.message}`);
    }
  }

  /**
   * Delete manufactured product
   */
  static async deleteManufacturedProduct(productId) {
    try {
      console.log('🗑️ Deleting manufactured product:', productId);
      
      const docRef = doc(db, this.COLLECTION_NAME, productId);
      await deleteDoc(docRef);
      
      console.log('✅ Manufactured product deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting manufactured product:', error);
      throw new Error(`فشل في حذف المنتج المصنع: ${error.message}`);
    }
  }

  /**
   * Search manufactured products
   */
  static async searchManufacturedProducts(searchTerm) {
    try {
      console.log('🔍 Searching manufactured products:', searchTerm);
      
      // Get all products and filter client-side (simple approach)
      const allProducts = await this.getAllManufacturedProducts();
      
      if (!searchTerm.trim()) {
        return allProducts;
      }
      
      const searchLower = searchTerm.toLowerCase();
      const filtered = allProducts.filter(product => 
        product.title?.toLowerCase().includes(searchLower) ||
        product.referenceNumber?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.category?.toLowerCase().includes(searchLower) ||
        product.entity?.toLowerCase().includes(searchLower)
      );

      console.log('✅ Search results:', filtered.length);
      return filtered;
    } catch (error) {
      console.error('❌ Error searching manufactured products:', error);
      throw new Error(`فشل في البحث عن المنتج المصنعة: ${error.message}`);
    }
  }

  /**
   * Get manufactured products by status
   */
  static async getManufacturedProductsByStatus(status) {
    try {
      console.log('📋 Loading manufactured products by status:', status);
      
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const products = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        products.push({
          id: doc.id,
          internalId: data.internalId || generateId('MANUFACTURED_PRODUCT'), // Generate if missing
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });

      console.log('✅ Loaded manufactured products by status:', products.length);
      return products;
    } catch (error) {
      console.error('❌ Error loading manufactured products by status:', error);
      throw new Error(`فشل في تحميل المنتج المصنعة: ${error.message}`);
    }
  }

  /**
   * Validate manufactured product data
   */
  static validateManufacturedProductData(productData) {
    const errors = {};

    if (!productData.title || !productData.title.trim()) {
      errors.title = 'اسم المنتج مطلوب';
    }

    if (!productData.referenceNumber || !productData.referenceNumber.trim()) {
      errors.referenceNumber = 'رقم المرجع مطلوب';
    }

    if (!productData.entity || !productData.entity.trim()) {
      errors.entity = 'الجهة المصنعة مطلوبة';
    }

    if (!productData.submissionDeadline) {
      errors.submissionDeadline = 'تاريخ الإنتاج المتوقع مطلوب';
    }

    if (productData.estimatedValue && isNaN(parseFloat(productData.estimatedValue))) {
      errors.estimatedValue = 'التكلفة التقديرية يجب أن تكون رقماً صحيحاً';
    }

    return errors;
  }
}

