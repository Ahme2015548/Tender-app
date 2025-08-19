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

const SUPPLIERS_COLLECTION = 'suppliers';

export class SupplierService {
  
  static async getAllSuppliers() {
    try {
      const suppliersRef = collection(db, SUPPLIERS_COLLECTION);
      
      // Try to get all documents first, then order if there are any
      let q;
      try {
        q = query(suppliersRef, orderBy('createdAt', 'desc'));
      } catch (orderError) {
        console.log('Using query without orderBy for empty collection');
        q = query(suppliersRef);
      }
      
      const querySnapshot = await getDocs(q);
      
      const docs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('LOCAL_SUPPLIER'), // Generate proper internal ID if missing
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
      console.error('Error fetching suppliers:', error);
      // Return empty array for missing collections instead of throwing error
      if (error.code === 'failed-precondition' || error.code === 'not-found') {
        console.log('Suppliers collection not found, returning empty array');
        return [];
      }
      throw new Error('فشل في تحميل الموردين');
    }
  }

  static async createSupplier(supplierData) {
    try {
      const internalId = generateId('LOCAL_SUPPLIER');
      const supplierDoc = {
        ...supplierData,
        internalId: internalId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, SUPPLIERS_COLLECTION), supplierDoc);
      return docRef.id;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw new Error('فشل في إنشاء المورد');
    }
  }

  static async updateSupplier(supplierId, supplierData) {
    try {
      const supplierRef = doc(db, SUPPLIERS_COLLECTION, supplierId);
      const updateData = {
        ...supplierData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(supplierRef, updateData);
      return true;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw new Error('فشل في تحديث بيانات المورد');
    }
  }

  static async getSupplierById(supplierId) {
    try {
      const supplierRef = doc(db, SUPPLIERS_COLLECTION, supplierId);
      const docSnap = await getDoc(supplierRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          internalId: data.internalId || generateId('LOCAL_SUPPLIER'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching supplier by ID:', error);
      throw new Error('فشل في جلب بيانات المورد');
    }
  }

  static async getSupplierByInternalId(internalId) {
    try {
      const suppliersRef = collection(db, SUPPLIERS_COLLECTION);
      const q = query(suppliersRef, where('internalId', '==', internalId));
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
      console.error('Error fetching supplier by internal ID:', error);
      throw new Error('فشل في جلب بيانات المورد');
    }
  }

  static async updateSupplierByInternalId(internalId, supplierData) {
    try {
      const supplier = await this.getSupplierByInternalId(internalId);
      if (!supplier) {
        throw new Error('Supplier not found');
      }
      
      return await this.updateSupplier(supplier.id, supplierData);
    } catch (error) {
      console.error('Error updating supplier by internal ID:', error);
      throw new Error('فشل في تحديث بيانات المورد');
    }
  }

  static async deleteSupplier(supplierId) {
    try {
      const supplierRef = doc(db, SUPPLIERS_COLLECTION, supplierId);
      await deleteDoc(supplierRef);
      return true;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw new Error('فشل في حذف المورد');
    }
  }

  static async deleteSupplierByInternalId(internalId) {
    try {
      const supplier = await this.getSupplierByInternalId(internalId);
      if (!supplier) {
        throw new Error('Supplier not found');
      }
      
      return await this.deleteSupplier(supplier.id);
    } catch (error) {
      console.error('Error deleting supplier by internal ID:', error);
      throw new Error('فشل في حذف المورد');
    }
  }


  static async searchSuppliers(searchTerm) {
    try {
      const suppliersRef = collection(db, SUPPLIERS_COLLECTION);
      const querySnapshot = await getDocs(suppliersRef);
      
      const allSuppliers = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('LOCAL_SUPPLIER'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });

      // Client-side filtering for Arabic/English names
      const filteredSuppliers = allSuppliers.filter(supplier => 
        supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.phone?.includes(searchTerm)
      );

      return filteredSuppliers;
    } catch (error) {
      console.error('Error searching suppliers:', error);
      throw new Error('فشل في البحث عن الموردين');
    }
  }

  // Data migration function
  static async migrateExistingData() {
    try {
      console.log('Starting local suppliers migration...');
      const suppliers = await this.getAllSuppliers();
      let migratedCount = 0;
      
      for (const supplier of suppliers) {
        // Check if internalId is missing or using old format
        if (!supplier.internalId || !supplier.internalId.startsWith('ls_')) {
          const newInternalId = generateId('LOCAL_SUPPLIER');
          await this.updateSupplier(supplier.id, {
            ...supplier,
            internalId: newInternalId
          });
          migratedCount++;
          console.log(`Migrated local supplier: ${supplier.name} -> ${newInternalId}`);
        }
      }
      
      console.log(`Migration completed. ${migratedCount} local suppliers migrated.`);
      return { success: true, migratedCount };
    } catch (error) {
      console.error('Error during migration:', error);
      throw new Error('فشل في ترحيل البيانات');
    }
  }

  static validateSupplierData(supplierData) {
    const errors = {};
    
    if (!supplierData.name?.trim()) {
      errors.name = 'اسم المورد مطلوب';
    }
    
    if (!supplierData.email?.trim()) {
      errors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierData.email)) {
      errors.email = 'صيغة البريد الإلكتروني غير صحيحة';
    }
    
    if (!supplierData.phone?.trim()) {
      errors.phone = 'رقم الهاتف مطلوب';
    }
    
    return errors;
  }
}