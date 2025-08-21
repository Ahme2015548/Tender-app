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

const FOREIGN_SUPPLIERS_COLLECTION = 'foreignSuppliers';

export class ForeignSupplierService {
  
  static async getAllForeignSuppliers() {
    return this.getAllSuppliers();
  }

  static async getAllSuppliers() {
    try {
      const suppliersRef = collection(db, FOREIGN_SUPPLIERS_COLLECTION);
      
      // Try with orderBy first, fallback to simple query if needed
      let querySnapshot;
      try {
        const q = query(suppliersRef, orderBy('createdAt', 'desc'));
        querySnapshot = await getDocs(q, 'getAllForeignSuppliers');
      } catch (orderError) {
        console.log('OrderBy failed, using simple query:', orderError.message);
        querySnapshot = await getDocs(suppliersRef, 'getAllForeignSuppliers-simple');
      }
      
      const docs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('FOREIGN_SUPPLIER'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        };
      });
      
      // Sort manually if orderBy failed
      if (docs.length > 0 && docs[0].createdAt) {
        docs.sort((a, b) => (b.createdAt || new Date(0)) - (a.createdAt || new Date(0)));
      }
      
      return docs;
    } catch (error) {
      console.error('Error fetching foreign suppliers:', error);
      // Return empty array for missing collections instead of throwing error
      if (error.code === 'failed-precondition' || error.code === 'not-found') {
        console.log('Foreign suppliers collection not found, returning empty array');
        return [];
      }
      throw new Error('فشل في تحميل الموردين الأجانب: ' + error.message);
    }
  }

  static async getSupplierById(id) {
    try {
      const data = await readById(FOREIGN_SUPPLIERS_COLLECTION, id);
      if (!data) {
        throw new Error('Foreign supplier not found');
      }
      
      return {
        ...data,
        internalId: data.internalId || generateId('FOREIGN_SUPPLIER'),
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date()
      };
    } catch (error) {
      console.error('Error fetching foreign supplier:', error);
      throw new Error('Failed to fetch foreign supplier: ' + error.message);
    }
  }

  static async createSupplier(supplierData) {
    try {
      const validationErrors = this.validateSupplierData(supplierData);
      if (Object.keys(validationErrors).length > 0) {
        throw new Error('Validation failed: ' + Object.values(validationErrors).join(', '));
      }

      const suppliersRef = collection(db, FOREIGN_SUPPLIERS_COLLECTION);
      const internalId = generateId('FOREIGN_SUPPLIER');
      const newSupplier = {
        ...supplierData,
        internalId: internalId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: supplierData.status || 'active'
      };
      
      const docId = await createWithId(FOREIGN_SUPPLIERS_COLLECTION, newSupplier);
      
      return {
        id: docId,
        ...newSupplier,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creating foreign supplier:', error);
      throw new Error('Failed to create foreign supplier: ' + error.message);
    }
  }

  static async updateSupplier(id, supplierData) {
    try {
      const validationErrors = this.validateSupplierData(supplierData);
      if (Object.keys(validationErrors).length > 0) {
        throw new Error('Validation failed: ' + Object.values(validationErrors).join(', '));
      }

      const supplierDoc = doc(db, FOREIGN_SUPPLIERS_COLLECTION, id);
      const updatedData = {
        ...supplierData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(supplierDoc, updatedData, 'updateForeignSupplier');
      
      return {
        id,
        ...updatedData,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error updating foreign supplier:', error);
      throw new Error('Failed to update foreign supplier: ' + error.message);
    }
  }

  static async getSupplierByInternalId(internalId) {
    try {
      const suppliersRef = collection(db, FOREIGN_SUPPLIERS_COLLECTION);
      const q = query(suppliersRef, where('internalId', '==', internalId));
      const querySnapshot = await getDocs(q, 'getForeignSupplierByInternalId');
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching foreign supplier by internal ID:', error);
      throw new Error('Failed to fetch foreign supplier by internal ID: ' + error.message);
    }
  }

  static async updateSupplierByInternalId(internalId, supplierData) {
    try {
      const supplier = await this.getSupplierByInternalId(internalId);
      if (!supplier) {
        throw new Error('Foreign supplier not found');
      }
      
      return await this.updateSupplier(supplier.id, supplierData);
    } catch (error) {
      console.error('Error updating foreign supplier by internal ID:', error);
      throw new Error('Failed to update foreign supplier by internal ID: ' + error.message);
    }
  }

  static async deleteSupplier(id) {
    try {
      const supplierDoc = doc(db, FOREIGN_SUPPLIERS_COLLECTION, id);
      await deleteDoc(supplierDoc, 'deleteForeignSupplier');
      
      return { success: true, message: 'Foreign supplier deleted successfully' };
    } catch (error) {
      console.error('Error deleting foreign supplier:', error);
      throw new Error('Failed to delete foreign supplier: ' + error.message);
    }
  }

  static async deleteSupplierByInternalId(internalId) {
    try {
      const supplier = await this.getSupplierByInternalId(internalId);
      if (!supplier) {
        throw new Error('Foreign supplier not found');
      }
      
      return await this.deleteSupplier(supplier.id);
    } catch (error) {
      console.error('Error deleting foreign supplier by internal ID:', error);
      throw new Error('Failed to delete foreign supplier by internal ID: ' + error.message);
    }
  }

  static async getSuppliersByStatus(status) {
    try {
      const suppliersRef = collection(db, FOREIGN_SUPPLIERS_COLLECTION);
      const q = query(
        suppliersRef, 
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q, 'getForeignSuppliersByStatus');
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('FOREIGN_SUPPLIER'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        };
      });
    } catch (error) {
      console.error('Error fetching foreign suppliers by status:', error);
      throw new Error('Failed to fetch foreign suppliers by status: ' + error.message);
    }
  }

  static async searchSuppliers(searchTerm) {
    try {
      const suppliersRef = collection(db, FOREIGN_SUPPLIERS_COLLECTION);
      const querySnapshot = await getDocs(suppliersRef, 'searchForeignSuppliers');
      
      const allSuppliers = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('FOREIGN_SUPPLIER'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        };
      });

      if (!searchTerm || searchTerm.trim() === '') {
        return allSuppliers;
      }

      const searchTermLower = searchTerm.toLowerCase();
      return allSuppliers.filter(supplier =>
        supplier.name?.toLowerCase().includes(searchTermLower) ||
        supplier.email?.toLowerCase().includes(searchTermLower) ||
        supplier.phone?.includes(searchTerm) ||
        supplier.city?.toLowerCase().includes(searchTermLower) ||
        supplier.address?.toLowerCase().includes(searchTermLower)
      );
    } catch (error) {
      console.error('Error searching foreign suppliers:', error);
      throw new Error('Failed to search foreign suppliers: ' + error.message);
    }
  }

  static validateSupplierData(data) {
    const errors = {};

    // Required fields
    if (!data.name || data.name.trim() === '') {
      errors.name = 'Company name is required';
    }

    if (!data.email || data.email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!this.validateEmail(data.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!data.phone || data.phone.trim() === '') {
      errors.phone = 'Phone number is required';
    }

    // Optional field validations
    if (data.email && !this.validateEmail(data.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (data.name && data.name.length < 2) {
      errors.name = 'Company name must be at least 2 characters long';
    }

    if (data.phone && data.phone.length < 10) {
      errors.phone = 'Phone number must be at least 10 digits long';
    }

    return errors;
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // File upload methods for foreign supplier documents
  static async uploadDocument(supplierId, file, documentType = 'general') {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `foreign-suppliers/${supplierId}/documents/${documentType}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        fileName: file.name,
        url: downloadURL,
        type: documentType,
        uploadedAt: new Date(),
        size: file.size
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      throw new Error('Failed to upload document: ' + error.message);
    }
  }

  static async deleteDocument(documentUrl) {
    try {
      const fileRef = ref(storage, documentUrl);
      await deleteObject(fileRef);
      return { success: true, message: 'Document deleted successfully' };
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error('Failed to delete document: ' + error.message);
    }
  }

  // Data migration function
  static async migrateExistingData() {
    try {
      console.log('Starting foreign suppliers migration...');
      const suppliers = await this.getAllSuppliers();
      let migratedCount = 0;
      
      for (const supplier of suppliers) {
        // Check if internalId is missing or using old format
        if (!supplier.internalId || !supplier.internalId.startsWith('fs_')) {
          const newInternalId = generateId('FOREIGN_SUPPLIER');
          await this.updateSupplier(supplier.id, {
            ...supplier,
            internalId: newInternalId
          });
          migratedCount++;
          console.log(`Migrated foreign supplier: ${supplier.name} -> ${newInternalId}`);
        }
      }
      
      console.log(`Migration completed. ${migratedCount} foreign suppliers migrated.`);
      return { success: true, migratedCount };
    } catch (error) {
      console.error('Error during migration:', error);
      throw new Error('Failed to migrate foreign suppliers: ' + error.message);
    }
  }

  // Statistics and analytics
  static async getSupplierStats() {
    try {
      const suppliersRef = collection(db, FOREIGN_SUPPLIERS_COLLECTION);
      const querySnapshot = await getDocs(suppliersRef, 'getForeignSupplierStats');
      
      const suppliers = querySnapshot.docs.map(doc => doc.data());
      
      return {
        total: suppliers.length,
        active: suppliers.filter(s => s.status === 'active').length,
        inactive: suppliers.filter(s => s.status === 'inactive').length,
        pending: suppliers.filter(s => s.status === 'pending').length,
        byCity: suppliers.reduce((acc, supplier) => {
          const city = supplier.city || 'Unknown';
          acc[city] = (acc[city] || 0) + 1;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Error fetching foreign supplier stats:', error);
      throw new Error('Failed to fetch foreign supplier statistics: ' + error.message);
    }
  }
}